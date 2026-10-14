# Local API smoke test

This smoke test is only for the isolated local database `bike_auction_test`.
Copy `.env.test.example` to `.env.test` and configure a local MySQL account
before running it. Never point `.env.test` at a hosted or production database.

Create the empty test database once if it does not exist:

```sql
CREATE DATABASE bike_auction_test;
```

In PowerShell terminal 1, from `server/`:

```powershell
$env:NODE_ENV = "test"
npm run migrate
npm start
```

In a second PowerShell terminal, create a live auction directly in the test
database before bidding. Use your local MySQL client to run:

```sql
USE bike_auction_test;
INSERT INTO bikes (make, model, year, mileage_km) VALUES ('Honda', 'CB500', 2022, 12000);
SET @bike_id = LAST_INSERT_ID();
INSERT INTO auctions
  (bike_id, starting_price, min_increment, current_price, status, starts_at, ends_at)
VALUES
  (@bike_id, 1000, 100, 1000, 'live', UTC_TIMESTAMP() - INTERVAL 1 MINUTE,
   UTC_TIMESTAMP() + INTERVAL 10 MINUTE);
```

Run the following PowerShell requests from any directory. Registration/login
tokens stay in shell variables and are not printed:

```powershell
$base = "http://localhost:4000"
$body = '{"name":"Smoke Bidder","email":"smoke-bidder@example.test","password":"LocalTestPass123"}'
$registered = curl.exe -sS -X POST "$base/api/auth/register" -H "Content-Type: application/json" -d $body | ConvertFrom-Json
$loginBody = '{"email":"smoke-bidder@example.test","password":"LocalTestPass123"}'
$loggedIn = curl.exe -sS -X POST "$base/api/auth/login" -H "Content-Type: application/json" -d $loginBody | ConvertFrom-Json
$token = $loggedIn.token
curl.exe -sS "$base/api/auctions?status=live"

# Set this to the id returned by the list call.
$auctionId = 1
$requestId = [guid]::NewGuid().ToString()
$bidBody = "{`"amount`":1000,`"requestId`":`"$requestId`"}"
curl.exe -sS -X POST "$base/api/auctions/$auctionId/bids" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d $bidBody
curl.exe -sS -X POST "$base/api/auctions/$auctionId/bids" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d $bidBody
curl.exe -i "$base/api/auth/me"
```

Expected results: registration is `201`, login is `200`, the public list
contains the seeded auction, the first bid is `201`, its repeated request id is
`200` with `duplicate: true`, and the final unauthenticated request is `401`.
The same request id must be reused exactly for the retry.
