import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInMinutes } from "date-fns";
import Papa from "papaparse";
import "./App.css";
import { downloadCSV } from "./utils.js";

function App() {
  const [platformCount, setPlatformCount] = useState(null);
  const [platforms, setPlatforms] = useState([]); // to keep track of platform availibility
  const [schedule, setSchedule] = useState([]); // keep track of train schedule
  const [waitingTrains, setWaitingTrains] = useState([]); // keep track of waiting trains
  const [csvError, setCsvError] = useState("");
  const [trains, setTrains] = useState([]); // dashboard trains
  const [csvUploaded, setCsvUploaded] = useState(false);

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
        if (!results.data || results.data.length === 0) {
          setCsvError("CSV file is empty.");
          return;
        }

        const trains = results.data
          .map((row, index) => ({
            trainNumber: row["Train Number"],
            arrival: row["Arrival Time"],
            departure: row["Departure Time"],
            priority: row["Priority"]?.toLowerCase() || "medium",
            originalOrder: index,
            status: "scheduled",
          }))
          .filter((train) => train.trainNumber);

        trains.sort((a, b) => {
          const timeA = new Date(`1970-01-01T${a.arrival}`);
          const timeB = new Date(`1970-01-01T${b.arrival}`);
          if (timeA.getTime() !== timeB.getTime()) {
            return timeA - timeB;
          }
          if (a.priority !== b.priority) {
            return a.priority.localeCompare(b.priority);
          }

          return a.originalOrder - b.originalOrder;
        });

        console.log("Parsed CSV data:", trains);
        setSchedule(trains);
        setTrains(trains);
        setCsvError("");
        setCsvUploaded(true);
      },
      error: () =>
        setCsvError("Invalid CSV format. Please check the file structure."),
    });
  };

  const getTimeInMillis = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    )
      return 0;
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
      const updatedWaiting = [...waitingTrains];
      let updatedSchedule = [...schedule];

      // arrival Logic
      // First clear any trains in waiting list
      if (updatedWaiting.length > 0) {
        updatedWaiting.forEach((train, index) => {
          if (getTimeInMillis(train.arrival) <= now) {
            const freePlatformIndex = updatedPlatforms.findIndex(
              (p) => p === null,
            );
            if (freePlatformIndex !== -1) {
              const currDate = new Date();
              const arrivalMillis = getTimeInMillis(train.arrival);
              const departureMillis = getTimeInMillis(train.departure);
              if (
                arrivalMillis &&
                departureMillis &&
                departureMillis > arrivalMillis
              ) {
                const duration = departureMillis - arrivalMillis;
                const departureDate = new Date(currDate.getTime() + duration);

                updatedPlatforms[freePlatformIndex] = {
                  ...train,
                  actualArrival: currDate,
                  actualDeparture: departureDate,
                  status: "arrived",
                };

                setTrains((prev) =>
                  prev.map((t) =>
                    t.trainNumber === train.trainNumber
                      ? {
                          ...t,
                          actualArrival: currDate,
                          actualDeparture: departureDate,
                          status: "arrived",
                        }
                      : t,
                  ),
                );
                updatedWaiting.splice(index, 1);
              }
            }
          }
        });
      } else {
        // If no trains in waiting list, check the schedule
        updatedSchedule = updatedSchedule.filter((train) => {
          if (getTimeInMillis(train.arrival) <= now) {
            const freePlatformIndex = updatedPlatforms.findIndex(
              (p) => p === null,
            );
            if (freePlatformIndex !== -1) {
              const currDate = new Date();
              const arrivalMillis = getTimeInMillis(train.arrival);
              const departureMillis = getTimeInMillis(train.departure);
              if (
                arrivalMillis &&
                departureMillis &&
                departureMillis > arrivalMillis
              ) {
                const duration = departureMillis - arrivalMillis;
                const departureDate = new Date(currDate.getTime() + duration);

                updatedPlatforms[freePlatformIndex] = {
                  ...train,
                  actualArrival: currDate,
                  actualDeparture: departureDate,
                  status: "arrived",
                };

                setTrains((prev) =>
                  prev.map((t) =>
                    t.trainNumber === train.trainNumber
                      ? {
                          ...t,
                          actualArrival: currDate,
                          actualDeparture: departureDate,
                          status: "arrived",
                        }
                      : t,
                  ),
                );
                return false;
              }
            } else {
              updatedWaiting.push(train);
              return false;
            }
          }
          return true;
        });
      }

      // waiting sort logic
      updatedWaiting.sort((a, b) => {
        const timeA = new Date(`1970-01-01T${a.actualArrival}`);
        const timeB = new Date(`1970-01-01T${b.actualArrival}`);
        if (timeA.getTime() !== timeB.getTime()) return timeA - timeB;

        if (a.priority !== b.priority)
          return a.priority.localeCompare(b.priority);

        return a.originalOrder - b.originalOrder;
      });

      // departure logic
      updatedPlatforms.forEach((train, index) => {
        const departureTime = train?.actualDeparture
          ? new Date(train.actualDeparture).getTime()
          : null;
        if (departureTime && !isNaN(departureTime) && now >= departureTime) {
          updatedPlatforms[index] = null;
          setTrains((prev) =>
            prev.map((t) =>
              t.trainNumber === train.trainNumber
                ? { ...t, status: "departed" }
                : t,
            ),
          );
        }
      });

      setPlatforms(updatedPlatforms);
      setWaitingTrains(updatedWaiting);
      setSchedule(updatedSchedule);
    }, 1000);

    return () => clearInterval(interval);
  }, [platforms, schedule, waitingTrains]);

  console.log("schedule", schedule);
  return (
    <div className="app-container">
      <header>
        <h1>Train Station Dashboard</h1>
        <h5> Refresh Page to upload New Schedule</h5>
        <button onClick={downloadCSV} style={{ margin: "10px" }}>
          Download Test CSV
        </button>

        <div className="controls">
          {platformCount === null && (
            <>
              <p>Please set the number of platforms (2-20).</p>
              <form onSubmit={handlePlatformSubmit} className="platform-form">
                <input
                  type="number"
                  name="platforms"
                  min="2"
                  max="20"
                  defaultValue={platformCount}
                  required
                />
                <button type="submit">Set Platforms</button>
              </form>
            </>
          )}

          {!csvUploaded && platformCount && (
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
          )}
        </div>
      </header>

      <main>
        <section className="platform-section">
          <h2>Platform Status</h2>
          <div className="train-track">
            {platforms.map((train, idx) => (
              <div key={idx} className="platform-container">
                {/* Platform Label */}
                <div className="platform-label">
                  <h3>Platform {idx + 1}</h3>
                  {train && (
                    <span
                      className={`priority-badge ${train.priority.toLowerCase()}`}
                    >
                      {train.priority}
                    </span>
                  )}
                </div>

                {/* Train Element */}
                <AnimatePresence>
                  {train ? (
                    <motion.div
                      key={`train-${train.trainNumber}`}
                      className="train-element"
                      initial={{ x: -300, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 1000, opacity: 0 }}
                      transition={{
                        duration: 2,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="train-head">
                        <div className="train-number">{train.trainNumber}</div>
                        <div className="train-priority">{train.priority}</div>
                      </div>

                      <div className="train-body">
                        <div className="train-time">
                          <span className="time-label">Arrived:</span>
                          <span className="time-value">
                            {format(new Date(train.actualArrival), "HH:mm")}
                          </span>
                        </div>
                        <div className="train-time">
                          <span className="time-label">Departs in:</span>
                          <span className="time-value">
                            {differenceInMinutes(
                              new Date(train.actualDeparture),
                              new Date(),
                            ) + 1}{" "}
                            mins
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      className="empty-track"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      No train currently
                    </motion.div>
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
                {trains.length > 0 ? (
                  trains.map((train, index) => (
                    <tr key={index} className={train.status}>
                      <td>{train.trainNumber}</td>
                      <td
                        className={`priority ${train.priority.toLowerCase()}`}
                        style={{ paddingLeft: "35px" }}
                      >
                        {train.priority}
                      </td>
                      <td>{train.arrival}</td>
                      <td>
                        {train.actualArrival &&
                        !isNaN(new Date(train.actualArrival))
                          ? format(new Date(train.actualArrival), "HH:mm")
                          : "-"}
                      </td>
                      <td>{train.departure}</td>
                      <td>
                        {train.actualDeparture &&
                        !isNaN(new Date(train.actualDeparture))
                          ? format(new Date(train.actualDeparture), "HH:mm")
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
