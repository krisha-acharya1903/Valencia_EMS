import { getToken } from "./api";

const API_BASE = "http://localhost:5000/api";

function getAuthToken() {
  const tokenFromApi = getToken?.();

  if (tokenFromApi && tokenFromApi !== "undefined" && tokenFromApi !== "null") {
    return tokenFromApi;
  }

  const keys = [
    "token",
    "authToken",
    "valenciaToken",
    "valencia-token",
    "valencia_auth_token",
    "emsToken",
    "jwt",
    "accessToken",
  ];

  const storages = [localStorage, sessionStorage];

  for (const storage of storages) {
    for (const key of keys) {
      const value = storage.getItem(key);

      if (value && value !== "undefined" && value !== "null") {
        return value;
      }
    }

    for (const key of Object.keys(storage)) {
      const value = storage.getItem(key);

      if (!value) continue;

      try {
        const parsed = JSON.parse(value);

        if (parsed?.token) return parsed.token;
        if (parsed?.authToken) return parsed.authToken;
        if (parsed?.accessToken) return parsed.accessToken;
        if (parsed?.jwt) return parsed.jwt;
        if (parsed?.session?.token) return parsed.session.token;
        if (parsed?.auth?.token) return parsed.auth.token;
        if (parsed?.data?.token) return parsed.data.token;
      } catch {
        // ignore non-json values
      }
    }
  }

  return "";
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Missing authorization token. Please logout and login again.");
  }

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();

  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed: ${options.method || "GET"} ${path}`;

    throw new Error(message);
  }

  return data;
}

async function tryApiRequests(paths, options = {}) {
  let lastError = null;

  for (const path of paths) {
    try {
      return await apiRequest(path, options);
    } catch (error) {
      lastError = error;
      console.warn(`Leave API failed: ${path}`, error.message);
    }
  }

  throw lastError || new Error("Leave request API failed.");
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.leaves)) return data.leaves;
  if (Array.isArray(data?.leaveRequests)) return data.leaveRequests;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function extractOne(data) {
  if (data?.leave) return data.leave;
  if (data?.leaveRequest) return data.leaveRequest;
  if (data?.request) return data.request;
  if (data?.data) return data.data;

  return data;
}

export function normalizeLeaveRequest(leave = {}) {
  return {
    ...leave,

    id: String(leave.id || leave.leaveId || leave.leave_id || ""),
    leaveId: String(leave.id || leave.leaveId || leave.leave_id || ""),

    userId: String(
      leave.userId ||
        leave.user_id ||
        leave.employeeId ||
        leave.employee_id ||
        leave.requestedBy ||
        leave.requested_by ||
        ""
    ),

    userName:
      leave.userName ||
      leave.user_name ||
      leave.employeeName ||
      leave.employee_name ||
      leave.name ||
      "",

    userEmail:
      leave.userEmail ||
      leave.user_email ||
      leave.employeeEmail ||
      leave.employee_email ||
      leave.email ||
      "",

    leaveType: leave.leaveType || leave.leave_type || leave.type || "Leave",

    reason: leave.reason || leave.message || leave.description || "",

    startDate:
      leave.startDate ||
      leave.start_date ||
      leave.fromDate ||
      leave.from_date ||
      leave.date ||
      "",

    endDate:
      leave.endDate ||
      leave.end_date ||
      leave.toDate ||
      leave.to_date ||
      leave.date ||
      "",

    status: String(leave.status || "pending").toLowerCase(),

    adminComment:
      leave.adminComment || leave.admin_comment || leave.comment || "",

    createdAt:
      leave.createdAt ||
      leave.created_at ||
      leave.applicationDate ||
      leave.application_date ||
      leave.date ||
      "",

    updatedAt: leave.updatedAt || leave.updated_at || "",

    reviewedAt: leave.reviewedAt || leave.reviewed_at || "",

    hasAttachment: Boolean(
      leave.hasAttachment ||
        leave.has_attachment ||
        leave.attachmentPath ||
        leave.attachment_path ||
        leave.attachmentUrl ||
        leave.attachment_url
    ),

    attachmentFilename:
      leave.attachmentFilename || leave.attachment_filename || "",

    attachmentOriginalName:
      leave.attachmentOriginalName ||
      leave.attachment_original_name ||
      leave.originalName ||
      leave.original_name ||
      "",

    attachmentMimeType:
      leave.attachmentMimeType || leave.attachment_mime_type || "",

    attachmentSize: Number(leave.attachmentSize || leave.attachment_size || 0),

    attachmentUrl:
      leave.attachmentUrl ||
      leave.attachment_url ||
      (leave.id || leave.leaveId ? `/api/leaves/${leave.id || leave.leaveId}/attachment` : ""),
  };
}

function toCreatePayload(payload = {}) {
  return {
    leave_type: payload.leaveType || payload.leave_type || payload.type || "Leave",
    reason: payload.reason || payload.message || payload.description || "",
    start_date: payload.startDate || payload.start_date || payload.fromDate || "",
    end_date: payload.endDate || payload.end_date || payload.toDate || "",
    emergency_contact:
      payload.emergencyContact || payload.emergency_contact || "",
  };
}

function isFileLike(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.size === "number"
  );
}

function buildLeaveFormData(payload = {}, attachment = null) {
  const finalPayload = toCreatePayload(payload);
  const formData = new FormData();

  Object.entries(finalPayload).forEach(([key, value]) => {
    formData.append(key, value || "");
  });

  const finalAttachment = attachment || payload.attachment || payload.file || null;

  if (finalAttachment) {
    formData.append("attachment", finalAttachment);
  }

  return formData;
}

export async function getLeaveRequests() {
  try {
    const data = await tryApiRequests([
      "/leaves/me",
      "/leave-requests",
      "/leaves",
      "/leave",
      "/attendance/leaves",
      "/attendance/leave-requests",
    ]);

    return extractList(data).map(normalizeLeaveRequest);
  } catch (error) {
    console.warn("Leave requests could not be loaded. Returning empty list.", error.message);
    return [];
  }
}

export async function createLeaveRequest(firstArg = {}, secondArg = null, thirdArg = null) {
  let payload = firstArg || {};
  let attachment = null;

  if (isFileLike(secondArg)) {
    attachment = secondArg;
  } else if (secondArg && typeof secondArg === "object") {
    payload = secondArg;
    attachment = thirdArg || secondArg.attachment || secondArg.file || null;
  } else {
    attachment = thirdArg || firstArg.attachment || firstArg.file || null;
  }

  const formData = buildLeaveFormData(payload, attachment);

  const data = await tryApiRequests(["/leaves", "/leave-requests"], {
    method: "POST",
    body: formData,
  });

  return normalizeLeaveRequest(extractOne(data));
}

export async function reviewLeaveRequest(profile, leaveId, status, adminComment = "") {
  if (!leaveId) {
    throw new Error("Leave request ID is missing.");
  }

  const payload = {
    status,
    admin_comment: adminComment,
    adminComment,
  };

  const data = await tryApiRequests(
    [
      `/leaves/${leaveId}/review`,
      `/leave-requests/${leaveId}/review`,
      `/leave-requests/${leaveId}`,
      `/leaves/${leaveId}`,
      `/leave/${leaveId}/review`,
      `/leave/${leaveId}`,
      `/attendance/leaves/${leaveId}/review`,
      `/attendance/leaves/${leaveId}`,
    ],
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

  return normalizeLeaveRequest(extractOne(data));
}

export async function updateLeaveRequest(profile, leaveId, updates = {}) {
  if (!leaveId) {
    throw new Error("Leave request ID is missing.");
  }

  const data = await tryApiRequests(
    [`/leave-requests/${leaveId}`, `/leaves/${leaveId}`, `/leave/${leaveId}`],
    {
      method: "PATCH",
      body: JSON.stringify({
        ...toCreatePayload(updates),
        status: updates.status,
        admin_comment: updates.adminComment || updates.admin_comment || "",
      }),
    }
  );

  return normalizeLeaveRequest(extractOne(data));
}

export async function deleteLeaveRequest(profile, leaveId) {
  if (!leaveId) {
    throw new Error("Leave request ID is missing.");
  }

  await tryApiRequests(
    [`/leave-requests/${leaveId}`, `/leaves/${leaveId}`, `/leave/${leaveId}`],
    {
      method: "DELETE",
    }
  );

  return true;
}

export async function downloadLeaveAttachment(leaveId, filename = "leave-attachment") {
  if (!leaveId) {
    throw new Error("Leave request ID is missing.");
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error("Missing authorization token. Please logout and login again.");
  }

  const response = await fetch(`${API_BASE}/leaves/${leaveId}/attachment`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = "Failed to download attachment.";

    try {
      const data = await response.json();
      message = data?.message || message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename || "leave-attachment";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);

  return true;
}