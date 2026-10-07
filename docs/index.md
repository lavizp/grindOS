Build a polished personal tracking app that I can use privately on my iPhone.

The app should focus on **three main areas: Workouts, Sleep, and Spending**. The goal is to make it extremely easy to enter data every day and then give me useful insights over time.

The app should be **local-first and work completely offline**. Use IndexedDB for persistent local storage. It should be installable as a PWA and feel like a proper mobile app when opened from the iPhone home screen. There should be no requirement for an account, backend, or internet connection for normal usage.

## 1. Dashboard

Create a clean home dashboard showing a quick overview of my life.

It should include things like:

- Today's workout status
- Last night's sleep
- Today's/recent spending
- Weekly/monthly trends
- Useful summaries and statistics
- Quick actions to log a workout, sleep, or payment

The dashboard should prioritize information that is actually useful rather than trying to show everything at once.

## 2. Workout Tracking

I want to track my workouts over time.

I should be able to:

- Log a workout for a specific date
- Give the workout a name/type, such as Push, Pull, Legs, Running, etc.
- Add exercises
- Track sets, reps, and weight
- Add notes
- Edit or delete previous workouts

The app should make logging a workout fast, especially from a phone.

Over time, show useful information such as:

- Workout frequency
- Exercises I perform most often
- Progress in weights/reps
- Weekly/monthly workout history
- Personal records where appropriate
- Workout consistency

Don't make the user manually enter unnecessary information.

## 3. Sleep Tracking

Allow me to quickly record my sleep.

Track:

- Date
- Bedtime
- Wake-up time
- Total sleep duration
- Optional sleep quality/rating
- Optional notes

Show useful trends such as:

- Average sleep duration
- Sleep consistency
- Weekly/monthly sleep trends
- Best/worst sleep days
- Relationship between sleep and workout consistency where useful

Make entering sleep extremely quick.

## 4. Spending / Payment Tracking

This is an important part of the app.

I want to record every payment/expense I make.

Each transaction should have:

- Amount
- Date
- Category
- Description/merchant
- Optional notes

Provide sensible default categories such as:

- Food
- Transport
- Shopping
- Entertainment
- Bills
- Subscriptions
- Health
- Education
- Other

Make categories editable if practical.

The app should turn this raw data into useful financial insights.

For example:

- Total spending this month
- Total spending this week
- Spending by category
- Highest spending categories
- Average daily/monthly spending
- Month-over-month comparison
- Spending trends over time
- Largest individual expenses
- Breakdown of where most of my money goes

Charts should make these insights easy to understand.

## 5. History

Provide a way to browse everything I've recorded.

I should be able to filter and navigate by:

- Day
- Week
- Month
- Category
- Type of activity

The history should be easy to scan and edit.

## 6. Insights

The app should not just be a database of entries.

It should actively surface useful observations from my data.

Examples:

- "You've spent 32% more on food this month."
- "You've worked out 4 times this week."
- "Your average sleep this week is 6h 48m."
- "Your most expensive category this month is Food."
- "You've been sleeping less on days following late workouts."

Keep insights simple, useful, and understandable.

## 7. Design

Make the app feel like a **modern personal health/lifestyle dashboard**, not an enterprise application.

Prioritize:

- Mobile-first design
- Clean typography
- Spacious UI
- Clear visual hierarchy
- Smooth interactions
- Simple navigation
- Attractive but not excessive charts
- Fast data entry

Use a bottom navigation on mobile with sections such as:

**Home · Workout · Sleep · Spending**

There should always be an obvious way to quickly add a new entry.

Avoid unnecessary complexity. This is a personal app, so optimize for **speed and usability rather than feature count**.

## 8. Offline-first

The app must work without an internet connection.

Persist all user data locally using **IndexedDB**.

The core experience should work completely offline:

- Adding data
- Editing data
- Viewing history
- Calculating statistics
- Viewing charts
- Dashboard
- Insights

Make it a **PWA** that can be installed on an iPhone home screen and behaves like an app.

## 9. Data safety

Because this contains personal financial, workout, and sleep data:

- Don't send personal data to external services.
- Don't require an account.
- Keep everything local by default.
- Add data export/import functionality so I can back up my data and move it to another device.

A simple JSON export/import system is sufficient.

## 10. General product principle

The most important goal is:

> **Make tracking effortless and make the collected data genuinely useful.**

I don't want a complicated database UI where I have to fill out 20 fields every time.

I want something I can open on my phone, spend a few seconds entering what happened, and then later look at the app to understand my **fitness, sleep, and spending habits**.

Build the MVP completely and make it polished enough that I would actually want to use it every day.
