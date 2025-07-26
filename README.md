To run code follow this procedure

1.git clone https://github.com/govind098/Lock-Api
2.npm install
3.node index.js

For Api Testing 
Open PostMan 

1. Lock a Table
Endpoint: POST  http://localhost:3000/api/tables/lock

Body (raw, JSON):

{
  "tableId": "table-1",
  "userId": "user-1",
  "duration": 300
}

2. Unlock a Table
Endpoint: POST  http://localhost:3000/api/tables/unlock

Body (raw, JSON):

{
  "tableId": "table-1",
  "userId": "user-1"
}

3. Check Table Lock Status
Endpoint: GET http://localhost:3000/api/tables/table-1/status

4. View All Active Locks (Debug/Testing)
Endpoint: GET http://localhost:3000/api/tables/locks

5. Health Check
Endpoint: GET http://localhost:3000/health
