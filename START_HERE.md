# START HERE — Campus Lost and Found Portal

This ZIP contains the complete frontend, Express backend, MongoDB/Mongoose database layer,
sample records, Postman collection, automated tests, screenshots, and report draft.

## 1. Install prerequisites
- Node.js 18 or newer: https://nodejs.org/
- MongoDB Community Server (local) OR a MongoDB Atlas cluster: https://www.mongodb.com/atlas
- VS Code and Postman

## 2. Open and install
Extract the ZIP, open the `campus-lost-and-found` folder in VS Code, then open Terminal > New Terminal.
Run in PowerShell:

```powershell
npm install
Copy-Item .env.example .env
```

## 3. Configure the persistent MongoDB database
Open `.env` and set `MONGO_URI`.

For local MongoDB:
```env
MONGO_URI=mongodb://127.0.0.1:27017/campus_lost_found
```
Make sure the MongoDB service is installed and running.

For MongoDB Atlas:
```env
MONGO_URI=mongodb+srv://DB_USER:DB_PASSWORD@YOUR_CLUSTER.mongodb.net/campus_lost_found?retryWrites=true&w=majority
```
Replace the placeholders with your own Atlas database user, password, and cluster host.
In Atlas, allow your development IP address in Network Access and create a database user.
Do not share your real connection string or commit `.env` to GitHub.

Also set a private random `JWT_SECRET`, for example a long random string. Do not use the example secret in a public deployment.

## 4. Seed demo records and start
The app seeds demo users, 12 sample listings and sample claims automatically on first startup
when `SEED_ON_START=true` and the database is empty. You can also run:

```powershell
npm run seed
npm run dev
```

Open: http://localhost:5000

The seed script includes demonstration accounts. Change/remove demo credentials and records
before any public or real campus deployment. See README.md for the demo login details.

## 5. Test the project
Run the automated offline API suite (uses the in-memory test driver, not MongoDB):

```powershell
npm run test:offline
```

Run the Postman collection:
1. Open Postman.
2. Import `postman/Campus_Lost_and_Found.postman_collection.json`.
3. Import `postman/Local.postman_environment.json`.
4. Select the Local environment and run the collection.

For persistent MongoDB testing, configure `.env` with a test database and run `npm test`.
Capture your own Postman screenshots and record actual outcomes in the project report.

## 6. Important distinction
- The application uses MongoDB by default (`DB_DRIVER=mongo`) for persistent storage.
- The `memory` driver is only for offline automated tests and is not persistent.
- Local MongoDB stores data in your local database; Atlas stores data in your cloud cluster.
- The ZIP is source code. It does not contain your personal MongoDB account, Atlas credentials,
  GitHub repository, or a deployed live URL. Those must be configured by you.

## 7. Submission
Read `README.md` for the API list and deployment steps. Use the DOCX/PDF report drafts in
`docs/`, but transfer the content into the exact Sai University report format if your instructor
provided a mandatory template. Verify every feature yourself and include genuine screenshots.
