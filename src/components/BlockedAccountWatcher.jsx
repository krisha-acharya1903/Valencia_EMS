import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { checkAccountStatus } from "../services/accountStatusService";

export default function BlockedAccountWatcher() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const alreadyHandledRef = useRef(false);

  function clearSessionAndLogout(message) {
    if (alreadyHandledRef.current) return;

    alreadyHandledRef.current = true;

    window.alert(
      message || "Your account has been blocked. Please contact administrator."
    );

    try {
      if (logout) {
        logout();
      }
    } catch {
      // Ignore logout failure
    }

    sessionStorage.removeItem("valencia_auth_token");
    sessionStorage.removeItem("valencia_auth_user");
    localStorage.removeItem("valencia_auth_token");
    localStorage.removeItem("valencia_auth_user");

    navigate("/login", {
      replace: true,
    });
  }

  async function verifyAccount() {
    if (!profile) return;

    try {
      const result = await checkAccountStatus();

      if (
        result?.code === "ACCOUNT_BLOCKED" ||
        result?.status === "blocked"
      ) {
        clearSessionAndLogout(
          result?.message ||
            "Your account has been blocked. Please contact administrator."
        );
        return;
      }

      if (
        result?.code === "ACCOUNT_DELETED" ||
        result?.status === "deleted"
      ) {
        clearSessionAndLogout(
          result?.message ||
            "Your account has been deleted. Please contact administrator."
        );
      }
    } catch (error) {
      console.error("Account status watcher error:", error);
    }
  }

  useEffect(() => {
    if (!profile) return;

    verifyAccount();

    const interval = window.setInterval(() => {
      verifyAccount();
    }, 8000);

    function handleFocus() {
      verifyAccount();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        verifyAccount();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [profile?.id, profile?.email]);

  return null;
}