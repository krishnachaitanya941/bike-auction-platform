const { execFileSync } = require('node:child_process');

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

  it('sets production CORS headers on Express responses', () => {
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
          "process.env.DB_SSL='false';",
          "const request=require('supertest');",
          "const app=require('./src/app');",
          '(async()=>{',
          "const allowed=await request(app).get('/').set('Origin','https://bike-auction-platform-phi.vercel.app');",
          "const denied=await request(app).get('/').set('Origin','https://untrusted.example');",
          "console.log('CORS_RESULT:'+JSON.stringify({allowedOrigin:allowed.headers['access-control-allow-origin'],allowedCredentials:allowed.headers['access-control-allow-credentials'],deniedOrigin:denied.headers['access-control-allow-origin']}));",
          '})().catch(error=>{console.error(error);process.exitCode=1;});',
        ].join('\n'),
      ],
      { encoding: 'utf8', env: process.env }
    );
    const resultLine = output
      .split(/\r?\n/)
      .find((line) => line.startsWith('CORS_RESULT:'));

    expect(resultLine).toBeDefined();
    const result = JSON.parse(resultLine.slice('CORS_RESULT:'.length));
    expect(result.allowedOrigin).toBe('https://bike-auction-platform-phi.vercel.app');
    expect(result.allowedCredentials).toBe('true');
    expect(result.deniedOrigin).toBeUndefined();
  });
});
