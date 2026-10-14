const { execFileSync } = require('node:child_process');
const request = require('supertest');
const config = require('../../src/config');
const app = require('../../src/app');

describe('production CORS configuration', () => {
  it('allows only the deployed frontend and ignores CLIENT_ORIGIN', () => {
    const config = execFileSync(
      process.execPath,
      [
        '-e',
        "process.env.NODE_ENV='production'; process.env.JWT_SECRET='test'; process.env.DB_HOST='localhost'; process.env.DB_USER='test'; process.env.DB_PASSWORD='test'; process.env.DB_NAME='test'; process.env.CLIENT_ORIGIN='https://untrusted.example'; console.log(JSON.stringify(require('./src/config').clientOrigins));",
      ],
      { encoding: 'utf8', env: process.env }
    );

    expect(JSON.parse(config.trim())).toEqual([
      'https://bike-auction-platform-phi.vercel.app',
    ]);
  });

  it('sets production CORS headers on Express responses', async () => {
    const originalOrigins = config.clientOrigins.slice();
    config.clientOrigins.splice(
      0,
      config.clientOrigins.length,
      'https://bike-auction-platform-phi.vercel.app'
    );

    try {
      const allowed = await request(app)
        .get('/')
        .set('Origin', 'https://bike-auction-platform-phi.vercel.app');
      const denied = await request(app)
        .get('/')
        .set('Origin', 'https://untrusted.example');

      expect(allowed.headers['access-control-allow-origin']).toBe(
        'https://bike-auction-platform-phi.vercel.app'
      );
      expect(allowed.headers['access-control-allow-credentials']).toBe('true');
      expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      config.clientOrigins.splice(0, config.clientOrigins.length, ...originalOrigins);
    }
  });

  it('configures Socket.IO with the production origins and credentials', () => {
    const output = execFileSync(
      process.execPath,
      [
        '-e',
        [
          "process.env.NODE_ENV='production';",
          "process.env.JWT_SECRET='test';",
          "process.env.DB_HOST='localhost';",
          "process.env.DB_USER='test';",
          "process.env.DB_PASSWORD='test';",
          "process.env.DB_NAME='test';",
          "const socketIoPath=require.resolve('socket.io');",
          "require.cache[socketIoPath]={id:socketIoPath,filename:socketIoPath,loaded:true,exports:{Server:class{constructor(_server,options){global.socketOptions=options;} on(){}}}};",
          "require('./src/realtime').initRealtime({});",
          "console.log(JSON.stringify(global.socketOptions.cors));",
        ].join('\n'),
      ],
      { encoding: 'utf8', env: process.env }
    );

    expect(JSON.parse(output.trim())).toEqual({
      origin: ['https://bike-auction-platform-phi.vercel.app'],
      credentials: true,
    });
  });
});
