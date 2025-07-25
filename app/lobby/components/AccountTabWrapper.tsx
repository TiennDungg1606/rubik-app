import { useEffect, useState } from "react";
import AccountTab from "./AccountTab";

export default function AccountTabWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user) setUser(data.user);
        setLoading(false);
      });
  }, []);

  return <AccountTab user={user} loading={loading} />;
}
