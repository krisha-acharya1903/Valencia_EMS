import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAccountAdministratorAccess } from "../services/accountAdministratorService";

export default function AccountAdminNavLink() {
  const { profile } = useAuth();

  const [canCreateAccounts, setCanCreateAccounts] = useState(false);
  const [checked, setChecked] = useState(false);

  const isJayMore =
    String(profile?.email || "").toLowerCase() === "jaymore@valencia.com";

  const profileAllowsAccountCreation =
    profile?.isAccountAdministrator === true ||
    profile?.is_account_administrator === true ||
    profile?.is_account_administrator === 1 ||
    profile?.is_account_administrator === "1";

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const result = await getAccountAdministratorAccess();

        if (active) {
          setCanCreateAccounts(result.canCreateAccounts === true);
        }
      } catch {
        if (active) {
          setCanCreateAccounts(false);
        }
      } finally {
        if (active) {
          setChecked(true);
        }
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, []);

  if (!checked && !isJayMore && !profileAllowsAccountCreation) {
    return null;
  }

  if (!canCreateAccounts && !isJayMore && !profileAllowsAccountCreation) {
    return null;
  }

  return (
    <NavLink
      to="/dashboard/add-account"
      className={({ isActive }) =>
        `group flex items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-bold transition ${
          isActive
            ? "bg-[#FF6B35] text-white shadow-sm"
            : "text-[#061536] hover:bg-slate-50 hover:text-[#FF6B35]"
        }`
      }
    >
      <UserPlus size={21} strokeWidth={2.2} />
      <span>Add Account</span>
    </NavLink>
  );
}