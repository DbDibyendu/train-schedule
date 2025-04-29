export function generateTestCSV() {
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
export function downloadCSV() {
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
