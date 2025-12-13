"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { SessionUser } from "@/lib/getServerUser";

type SessionContextValue = {
	user: SessionUser | null;
	setUser: React.Dispatch<React.SetStateAction<SessionUser | null>>;
	refreshUser: () => Promise<SessionUser | null>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function useSessionUser() {
	const ctx = useContext(SessionContext);
	if (!ctx) {
		throw new Error("useSessionUser must be used within SessionProviderWrapper");
	}
	return ctx;
}

export default function SessionProviderWrapper({
	initialUser,
	children,
}: {
	initialUser: SessionUser | null;
	children: React.ReactNode;
}) {
	const [user, setUser] = useState<SessionUser | null>(initialUser);

	const refreshUser = useCallback(async () => {
		try {
			const res = await fetch("/api/user/me", { credentials: "include", cache: "no-store" });
			if (!res.ok) {
				setUser(null);
				return null;
			}
			const data = await res.json();
			const nextUser = data?.user ?? null;
			setUser(nextUser);
			return nextUser;
		} catch {
			setUser(null);
			return null;
		}
	}, []);

	const value = useMemo(
		() => ({
			user,
			setUser,
			refreshUser,
		}),
		[user, refreshUser]
	);

	return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
