import type { CSSProperties } from "react";

type ShopLogRow = {
  id: string;
  timestamp: string;
  shiftSupervisor: string;
  report: string;
  tool: string;
  status: "In Service" | "Limited Functionality" | "";
  blastGateFault: string;
  rptNo: string;
};

export default function Page() {
  const rows: ShopLogRow[] = [
    {
      id: "1",
      timestamp: "03/23/2026 02:02 PM",
      shiftSupervisor: "Nels Lundgren",
      report:
        "Missing orange magnetic featherboard",
      tool: "Not a Tool Repair Issue",
      status: "",
      blastGateFault: "",
      rptNo: "3,013",
    },
    {
      id: "2",
      timestamp: "03/21/2026 10:43 PM",
      shiftSupervisor: "Jerry Mackelburg",
      report:
        "The sandpaper was replaced because it was about to tear at the far-right side. The experienced member was using the full sander width + at the time. The new sandpaper (properly installed) starting to exhibit the same problem under the same usage conditions. The now problematic section was marked with blue tape on the right-side sander’s shroud. It appears that the last cut to size sandpaper roll has now been used.",
      tool: "Drum Sander 25 Inch Supermax M10",
      status: "Limited Functionality",
      blastGateFault: "",
      rptNo: "3,010",
    },
    {
      id: "3",
      timestamp: "03/21/2026 10:50 AM",
      shiftSupervisor: "Rick VanHatten",
      report: "Miss reported as worn bearings that were actually on M11",
      tool: "Drum Sander 25 Inch Supermax M10",
      status: "In Service",
      blastGateFault: "",
      rptNo: "2,971",
    },
    {
      id: "4",
      timestamp: "03/20/2026 02:41 PM",
      shiftSupervisor: "Marty Blake-Jacobson",
      report:
        "Replaced blade on bandsaw because previous one was dull.",
      tool: "Band Saw 14-3000 Laguna M2",
      status: "In Service",
      blastGateFault: "",
      rptNo: "3,005",
    },
    {
      id: "5",
      timestamp: "03/19/2026 11:18 AM",
      shiftSupervisor: "Dana Chapin",
      report:
        "Cleaned blade",
      tool: "Band Saw 18 Inch Laguna M1",
      status: "In Service",
      blastGateFault: "",
      rptNo: "3,004",
    },
    {
      id: "6",
      timestamp: "03/12/2026 04:28 PM",
      shiftSupervisor: "Patrick Duffy",
      report:
        "Dust chute repaired.",
      tool: "CNC Shapeco XXL M5",
      status: "In Service",
      blastGateFault: "",
      rptNo: "2,992",
    },
  ];

  const thStyle: CSSProperties = {
    textAlign: "left",
    padding: "0.75rem",
    borderBottom: "1px solid #ddd",
    whiteSpace: "nowrap",
    verticalAlign: "bottom",
  };

  const tdStyle: CSSProperties = {
    padding: "0.75rem",
    borderBottom: "1px solid #eee",
    verticalAlign: "top",
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <section style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "1rem" }}>Shop Log</h1>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "900px",
              borderCollapse: "collapse",
              border: "1px solid #ddd",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Timestamp</th>
                <th style={thStyle}>Shift Supervisor</th>
                <th style={{ ...thStyle, minWidth: "220px" }}>Report</th>
                <th style={thStyle}>Tool</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Blast Gate Fault</th>
                <th style={thStyle}>Rpt No.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.timestamp}</td>
                  <td style={tdStyle}>{row.shiftSupervisor}</td>
                  <td
                    style={{
                      ...tdStyle,
                      maxWidth: "360px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {row.report}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "pre-wrap" }}>{row.tool}</td>
                  <td style={tdStyle}>{row.status}</td>
                  <td style={tdStyle}>{row.blastGateFault}</td>
                  <td style={tdStyle}>{row.rptNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
