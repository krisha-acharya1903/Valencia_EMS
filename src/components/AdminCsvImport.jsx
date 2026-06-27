import { useState } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { apiPost } from "../services/api";

export default function AdminCsvImport({ onImported }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  const requiredColumns = ["name", "email", "password", "role"];

  function normalizeRow(row) {
    return {
      name: String(row.name || "").trim(),
      email: String(row.email || "").trim().toLowerCase(),
      password: String(row.password || "").trim(),
      role: String(row.role || "employee").trim().toLowerCase(),
      department: String(row.department || "").trim(),
      phone: String(row.phone || "").trim(),
    };
  }

  function validateRows(parsedRows) {
    const cleanRows = parsedRows
      .map(normalizeRow)
      .filter((row) => row.name || row.email || row.password || row.role);

    if (!cleanRows.length) {
      throw new Error("CSV file is empty.");
    }

    const missingRows = [];

    cleanRows.forEach((row, index) => {
      requiredColumns.forEach((column) => {
        if (!row[column]) {
          missingRows.push(`Row ${index + 2}: Missing ${column}`);
        }
      });

      if (row.email && !row.email.includes("@")) {
        missingRows.push(`Row ${index + 2}: Invalid email`);
      }

      if (
        row.role &&
        !["employee", "admin", "superadmin", "manager"].includes(row.role)
      ) {
        missingRows.push(
          `Row ${index + 2}: Invalid role. Use employee, admin, manager, or superadmin`
        );
      }
    });

    if (missingRows.length) {
      throw new Error(missingRows.slice(0, 8).join("\n"));
    }

    return cleanRows;
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a CSV file only.");
      return;
    }

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const cleanRows = validateRows(result.data);
          setRows(cleanRows);
          toast.success(`${cleanRows.length} rows ready to import`);
        } catch (error) {
          setRows([]);
          toast.error(error.message);
        }
      },
      error: () => {
        setRows([]);
        toast.error("Could not read CSV file.");
      },
    });
  }

  async function handleImport() {
    if (!rows.length) {
      toast.error("Please upload a valid CSV first.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiPost("/admin/import-users-csv", {
        users: rows,
      });

      toast.success(response?.message || "CSV imported successfully");

      setRows([]);
      setFileName("");

      if (onImported) {
        onImported();
      }
    } catch (error) {
      toast.error(error?.message || "CSV import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="csv-import-card">
      <div className="csv-import-header">
        <div>
          <h3>Import Users by CSV</h3>
          <p>Upload employee/admin data in bulk using a CSV file.</p>
        </div>
      </div>

      <div className="csv-import-body">
        <label className="csv-upload-box">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
          />

          <span className="csv-upload-title">
            {fileName || "Choose CSV File"}
          </span>

          <small>
            Required columns: name, email, password, role
          </small>
        </label>

        {rows.length > 0 && (
          <div className="csv-preview">
            <div className="csv-preview-top">
              <strong>{rows.length} users found</strong>
              <button
                type="button"
                onClick={handleImport}
                disabled={loading}
                className="csv-import-btn"
              >
                {loading ? "Importing..." : "Import Now"}
              </button>
            </div>

            <div className="csv-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Phone</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.slice(0, 5).map((row, index) => (
                    <tr key={`${row.email}-${index}`}>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td>{row.role}</td>
                      <td>{row.department || "-"}</td>
                      <td>{row.phone || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > 5 && (
              <small className="csv-more-text">
                Showing first 5 rows only.
              </small>
            )}
          </div>
        )}
      </div>
    </div>
  );
}