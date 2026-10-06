# Finance Tracker

A personal finance app I built to keep track of where my money goes. You can log income and
expenses, set monthly budgets, see a dashboard for any month, and export a report as CSV or PDF.

It's a full-stack project: an **Angular** frontend talking to a **Spring Boot** REST API with a
**MySQL** database, secured with JWT logins.

## What it does

- **Accounts** – sign up and log in; every user only ever sees their own data.
- **Transactions** – add, edit and delete income and expenses, with categories (you can create your own).
- **Dashboard** – pick a month and see income, expenses, net balance, a spending-by-category chart and your latest transactions.
- **Budgets** – set a limit per category for the month. Progress bars go green, amber, then red as you get close to or pass the limit. You can copy last month's budgets in one click.
- **Reports** – preview a month and download it as CSV or PDF.
- **Currency and theme** – choose a display currency from the navbar, and switch between dark and light mode.

> The currency picker only changes how amounts are *shown*. Nothing is converted, so 10 USD
> and 10 INR are the same stored number.

## Built with

| | |
|---|---|
| Frontend | Angular 22 (standalone components, signals), Angular Material, Chart.js |
| Backend | Java 25, Spring Boot 4, Spring Security (JWT), Spring Data JPA |
| Database | MySQL 8+ |
| Tests | Vitest (frontend), JUnit 5 + Mockito (backend) |

## Running it locally

You'll need Java 25, a recent Node.js (I used 24) and MySQL 8+.

**1. Create the database**

```bash
mysql -u root -p < database/schema.sql
```

**2. Check the backend settings**

Open `finance-tracker-api/finance-tracker-api/src/main/resources/application.properties` and set
your MySQL password. Also replace `jwt.secret` with your own long random value, for example:

```bash
openssl rand -base64 48
```

(Spring Boot also lets you override these with environment variables such as
`SPRING_DATASOURCE_PASSWORD` and `JWT_SECRET`, so they don't have to live in the file.)

**3. Start the backend** (runs on http://localhost:8080)

```bash
cd finance-tracker-api/finance-tracker-api
./mvnw spring-boot:run
```

**4. Start the frontend** (runs on http://localhost:4200)

```bash
cd finance-tracker-ui
npm install
npm start
```

Open http://localhost:4200, create an account, and you're in. A starter set of categories is
added the first time you open the transaction form.

## Running the tests

```bash
cd finance-tracker-ui && npx ng test --watch=false
cd finance-tracker-api/finance-tracker-api && ./mvnw test
```

## How the code is organised

```
finance-tracker-api/   Spring Boot API  (controller → service → repository → entity)
finance-tracker-ui/    Angular app      (components, services, models, guards, interceptor)
database/schema.sql    The MySQL tables
```

## Things I learned along the way

- Never return a database entity straight from an API. I originally did, and it leaked the
  user's password hash in the JSON. Dedicated response objects fixed that, and there are tests
  to make sure it stays fixed.
- Browser CORS "preflight" requests carry no login token, so CORS has to be handled *before*
  the security check, not after.
- Notes in a CSV can run as formulas when opened in Excel, so the export neutralises them.
- This Angular version works without zone.js, which means the screen only updates when a
  *signal* changes. A plain method call in a template won't refresh on its own.

## Ideas for later

- Real exchange rates, so totals can be converted between currencies
- Recurring transactions (rent, subscriptions)
- Search and date-range filters on the transactions page
- Move secrets fully out of the repo and add login rate limiting before any real deployment
