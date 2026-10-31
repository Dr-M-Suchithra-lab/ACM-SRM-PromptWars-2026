// Only classify known messages. Never return raw PostgreSQL diagnostics/data.
export function rpcFailure(
  name: string,
  error: { code?: string; message?: string },
) {
  const code = error.code || "unknown";
  const message = error.message || "";
  if (code === "23505")
    return {
      status: 409,
      error: "An open review already exists for this shift.",
    };
  if (["PGRST202", "42883"].includes(code))
    return {
      status: 503,
      error:
        "This action requires a database function that is not available. Please contact the application owner.",
    };
  if (["23503", "23514", "22007", "22008", "22P02"].includes(code))
    return {
      status: 400,
      error:
        "The record or shift values are invalid. Refresh and check the dates, employee and organization.",
    };
  if (/invalid next status/i.test(message))
    return {
      status: 409,
      error:
        "This safety case has changed. Refresh and choose its next permitted status; enter at least ten characters explaining the action.",
    };
  if (/case status|already|verified|payroll-linked|immutable/i.test(message))
    return {
      status: 409,
      error: name.includes("review")
        ? "This review is no longer eligible for that action. Refresh the case and check whether it is awaiting the worker's confirmation."
        : "This record is already confirmed or linked to payroll and cannot be changed through this action.",
    };
  if (/invalid|break|minute|end must|exceed/i.test(message))
    return {
      status: 400,
      error:
        "Check the shift dates, break duration and explanation before saving.",
    };
  if (code === "42501" || /forbidden|permission|membership/i.test(message))
    return {
      status: 403,
      error:
        name === "confirm_shift"
          ? "You can confirm only your own shift in an authorized workplace."
          : "You do not have permission for this action in this workplace.",
    };
  if (code === "P0001")
    return {
      status: 403,
      error:
        "This action is not permitted for your account or the record's current state. Refresh the record and check your workplace permissions.",
    };
  return {
    status: 503,
    error:
      "The save service is temporarily unavailable. Please retry; contact the application owner if this continues.",
  };
}
