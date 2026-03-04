# Amazon EU Operations Portal

This is a frontend dashboard built to monitor and analyze Amazon's EU delivery network (AMZL). I put this together to act as a central hub for operations data—tracking everything from daily package volumes and on-time delivery rates to station health and capacity planning.

## What's Inside?

The application is split into several core modules to give a complete view of the network:
* **Network Dashboard:** Top-level KPIs, 30-day network performance charts, and a quick-glance risk matrix for all active stations.
* **Volume Forecasting:** I wired up a custom LSTM neural network running directly in the browser (using TensorFlow.js) that trains on historical data to predict 7-day future volume. It's really useful for catching capacity bottlenecks before they happen.
* **Capacity Planning:** Interactive tools to model what happens if we shift volume between stations or add more vans to a route.
* **Station Health & Route Optimization:** Drill-downs into specific delivery stations (like London Croydon or Paris CDG) to see exactly how they're performing against their specific targets.

## Tech Stack

I built this from the ground up using modern, fast web tech so it feels incredibly solid:
* **Framework:** React 19 + Vite for the fast dev environment.
* **Styling:** Custom CSS. I stripped out any generic "template" vibes to make it look like a serious enterprise tool—incorporating official Amazon colors, crisp typography, and subtle shadows.
* **Data Viz & Motion:** Recharts for the time-series data and Framer Motion for the page transitions (I used custom ease curves so navigating feels premium, not bouncy).
* **Machine Learning:** TensorFlow.js handles the anomaly detection and volume forecasting entirely client-side.

## Getting Started

1. Clone or download the repository.
2. Run `npm install` to grab the dependencies.
3. Run `npm run dev` to start the local Vite server.
4. Open the `localhost` link in your browser. All the data is synthetically generated on the fly, so you don't need a database connection to see it work immediately.

Created by Mohammed Kaif Ahmed.
