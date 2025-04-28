// src/App.js
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInMinutes } from "date-fns";
import Papa from "papaparse";
import "./App.css";

function App() {
  const [platformCount, setPlatformCount] = useState(2);
  const [platforms, setPlatforms] = useState(Array(2).fill(null));
  const [schedule, setSchedule] = useState([]);
  const [waitingTrains, setWaitingTrains] = useState([]);
  const [reports, setReports] = useState([]);
  const [csvError, setCsvError] = useState("");

  const handlePlatformSubmit = (e) => {
    e.preventDefault();
    const count = parseInt(e.target.elements.platforms.value);
    if (count >= 2 && count <= 20) {
      setPlatformCount(count);
      setPlatforms(Array(count).fill(null));
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const trains = results.data.map((row, index) => ({
          trainNumber: row["Train Number"],
          arrival: row["Arrival Time"],
          departure: row["Departure Time"],
          priority: row["Priority"],
          originalOrder: index,
          status: "scheduled",
        }));

        trains.sort((a, b) => {
          if (a.priority !== b.priority)
            return a.priority.localeCompare(b.priority);
          return a.originalOrder - b.originalOrder;
        });

        // Update reports with all scheduled trains
        const newReports = trains.map((train) => ({
          trainNumber: train.trainNumber,
          priority: train.priority,
          scheduledArrival: train.arrival,
          scheduledDeparture: train.departure,
          status: "scheduled",
        }));

        setSchedule(trains);
        setReports(newReports); // This updates the reports with the new schedule
        setCsvError("");
      },
      error: () =>
        setCsvError("Invalid CSV format. Please check the file structure."),
    });
  };

  const getTimeInMillis = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
    ).getTime();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const updatedPlatforms = [...platforms];
      const updatedReports = [...reports];
      const updatedWaiting = [...waitingTrains];
      let updatedSchedule = [...schedule];

      // Check departures
      updatedPlatforms.forEach((train, index) => {
        if (train && now >= getTimeInMillis(train.departure)) {
          updatedReports.push({
            ...train,
            actualDeparture: new Date(),
            status: "departed",
          });
          updatedPlatforms[index] = null;
        }
      });

      // Check arrivals
      updatedSchedule = updatedSchedule.filter((train) => {
        if (getTimeInMillis(train.arrival) <= now) {
          const freePlatformIndex = updatedPlatforms.findIndex(
            (p) => p === null,
          );
          if (freePlatformIndex !== -1) {
            updatedPlatforms[freePlatformIndex] = {
              ...train,
              actualArrival: new Date(),
              status: "arrived",
            };
            updatedReports.push({
              ...train,
              actualArrival: new Date(),
              status: "arrived",
            });
            return false;
          } else {
            updatedWaiting.push(train);
            return false;
          }
        }
        return true;
      });

      // Sort waiting trains by priority and original order
      updatedWaiting.sort((a, b) => {
        if (a.priority !== b.priority)
          return a.priority.localeCompare(b.priority);
        return a.originalOrder - b.originalOrder;
      });

      setPlatforms(updatedPlatforms);
      setWaitingTrains(updatedWaiting);
      setSchedule(updatedSchedule);
      setReports(updatedReports);
    }, 1000);

    return () => clearInterval(interval);
  }, [platforms, schedule, waitingTrains, reports]);

  function generateTestCSV() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Generate times starting from current time + 1 minute
    const trains = [
      { number: "22001", priority: "P1", stay: 1 },
      { number: "22002", priority: "P2", stay: 1 },
      { number: "22003", priority: "P1", stay: 1 },
      { number: "22004", priority: "P3", stay: 2 },
      { number: "22005", priority: "P2", stay: 1 },
      { number: "22006", priority: "P1", stay: 1 },
      { number: "22007", priority: "P3", stay: 1 },
      { number: "22008", priority: "P2", stay: 1 },
      { number: "22009", priority: "P1", stay: 1 },
      { number: "22010", priority: "P3", stay: 10 },
    ];

    let csv = "Train Number,Arrival Time,Departure Time,Priority\n";

    trains.forEach((train, index) => {
      const arrivalMin = minutes + index + 1;
      const arrivalHour = hours + Math.floor(arrivalMin / 60);
      const depMin = arrivalMin + train.stay;
      const depHour = arrivalHour + Math.floor(depMin / 60);

      const arrivalTime = `${String(arrivalHour % 24).padStart(2, "0")}:${String(arrivalMin % 60).padStart(2, "0")}`;
      const departureTime = `${String(depHour % 24).padStart(2, "0")}:${String(depMin % 60).padStart(2, "0")}`;

      csv += `${train.number},${arrivalTime},${departureTime},${train.priority}\n`;
    });

    return csv;
  }

  // To download the CSV file
  function downloadCSV() {
    const csv = generateTestCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "train_schedule.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  return (
    <div className="app-container">
      <header>
        <h1>Train Station Dashboard</h1>
        <button onClick={downloadCSV} style={{ margin: "10px" }}>
          Download Test CSV
        </button>
        <div className="controls">
          <form onSubmit={handlePlatformSubmit} className="platform-form">
            <input
              type="number"
              name="platforms"
              min="2"
              max="20"
              defaultValue={platformCount}
              placeholder="Platform count (2-20)"
              required
            />
            <button type="submit">Update Platforms</button>
          </form>

          <div className="csv-upload">
            <label>
              Upload Schedule CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                style={{ display: "none" }}
              />
            </label>
            {csvError && <div className="error-message">{csvError}</div>}
          </div>
        </div>
      </header>

      <main>
        <section className="platform-section">
          <h2>Platform Status</h2>
          <div className="platforms-grid">
            {platforms.map((train, idx) => (
              <div
                key={idx}
                className={`platform ${train ? "occupied" : "empty"}`}
              >
                <div className="platform-header">
                  <h3>Platform {idx + 1}</h3>
                  {train && (
                    <span
                      className={`priority-badge ${train.priority.toLowerCase()}`}
                    >
                      {train.priority}
                    </span>
                  )}
                </div>

                <AnimatePresence>
                  {train ? (
                    <motion.div
                      key={`train-${train.trainNumber}`}
                      className="train-info arriving"
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 100, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <p className="train-number">{train.trainNumber}</p>
                      <div className="time-info">
                        <div>
                          <span>Arrived:</span>
                          <span>
                            {format(new Date(train.actualArrival), "HH:mm")}
                          </span>
                        </div>
                        <div>
                          <span>Departs:</span>
                          <span>
                            {train.departure}
                            {` (in ${differenceInMinutes(
                              getTimeInMillis(train.departure),
                              Date.now(),
                            )} min)`}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p
                      className="empty-platform"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      Available
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        <section className="waiting-section">
          <h2>Waiting Trains ({waitingTrains.length})</h2>
          <div className="waiting-list">
            <AnimatePresence>
              {waitingTrains.length > 0 ? (
                waitingTrains.map((train, idx) => (
                  <motion.div
                    key={train.trainNumber}
                    className="waiting-train"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="train-number">{train.trainNumber}</span>
                    <span
                      className={`priority ${train.priority.toLowerCase()}`}
                    >
                      {train.priority}
                    </span>
                    <span className="arrival-time">
                      Scheduled: {train.arrival}
                    </span>
                  </motion.div>
                ))
              ) : (
                <motion.p
                  className="no-trains"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  No trains currently waiting
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </section>
        <section className="reports-section">
          <h2>Train Activity Report</h2>
          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Train No.</th>
                  <th>Priority</th>
                  <th>Scheduled Arrival</th>
                  <th>Actual Arrival</th>
                  <th>Scheduled Departure</th>
                  <th>Actual Departure</th>
                </tr>
              </thead>
              <tbody>
                {reports.length > 0 ? (
                  reports.map((report, index) => (
                    <tr key={index} className={report.status}>
                      <td>{report.trainNumber}</td>
                      <td
                        className={`priority ${report.priority.toLowerCase()}`}
                      >
                        {report.priority}
                      </td>
                      <td>{report.scheduledArrival}</td>
                      <td>
                        {report.actualArrival
                          ? format(new Date(report.actualArrival), "HH:mm")
                          : "-"}
                      </td>
                      <td>{report.scheduledDeparture}</td>
                      <td>
                        {report.actualDeparture
                          ? format(new Date(report.actualDeparture), "HH:mm")
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">
                      No activity to display
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
