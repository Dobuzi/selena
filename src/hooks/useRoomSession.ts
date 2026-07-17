"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientRoom } from "@/lib/room-view";

function storageKey(roomId: string) {
  return `selena:playerId:${roomId}`;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? "서버 응답을 읽지 못했어요."
        : `서버 오류 (${res.status}). 잠시 후 다시 시도해 주세요.`,
    );
  }
}

export function useRoomSession(roomId: string) {
  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const playerIdRef = useRef<string | null>(null);

  const applyRoom = useCallback((r: ClientRoom) => {
    setRoom(r);
    setError(null);
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
      const data = await readJson(res);
      if (!res.ok) {
        setError(String(data.message ?? "시험장이 없어요."));
        setRoom(null);
        return;
      }
      applyRoom(data.room as ClientRoom);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류가 났어요.");
    }
  }, [roomId, applyRoom]);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? sessionStorage.getItem(storageKey(roomId))
        : null;
    setPlayerId(stored);
    playerIdRef.current = stored;

    let cancelled = false;
    let es: EventSource | null = null;

    (async () => {
      if (stored) {
        try {
          await fetch(`/api/rooms/${roomId}/reconnect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId: stored }),
          });
        } catch {
          /* continue */
        }
      }
      if (cancelled) return;
      await fetchRoom();
      setLoading(false);
    })();

    const qs = stored ? `?playerId=${encodeURIComponent(stored)}` : "";
    try {
      es = new EventSource(`/api/rooms/${roomId}/events${qs}`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.error) {
            setError("시험장이 없어요.");
            setRoom(null);
            return;
          }
          if (data.room) applyRoom(data.room);
        } catch {
          /* ignore bad frames */
        }
      };
    } catch {
      /* EventSource unsupported — poll only */
    }

    const poll = setInterval(() => {
      void fetchRoom();
      const pid = playerIdRef.current;
      if (pid) {
        void fetch(`/api/rooms/${roomId}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: pid }),
        }).catch(() => {});
      }
    }, 2000);

    const onUnload = () => {
      const pid = playerIdRef.current;
      if (!pid) return;
      const body = JSON.stringify({ playerId: pid });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/rooms/${roomId}/leave`,
          new Blob([body], { type: "application/json" }),
        );
      }
    };
    window.addEventListener("pagehide", onUnload);

    return () => {
      cancelled = true;
      es?.close();
      clearInterval(poll);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [roomId, fetchRoom, applyRoom]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  const start = async () => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(String(data.message ?? "시작 실패"));
        return;
      }
      applyRoom(data.room as ClientRoom);
    } catch (e) {
      setError(e instanceof Error ? e.message : "시작 중 네트워크 오류");
    }
  };

  const answer = async (choiceIndex: number | null) => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, choiceIndex }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(String(data.message ?? "제출 실패"));
        return;
      }
      applyRoom(data.room as ClientRoom);
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출 중 네트워크 오류");
    }
  };

  const rematch = async () => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(String(data.message ?? "다시 하기 실패"));
        return;
      }
      applyRoom(data.room as ClientRoom);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 하기 중 네트워크 오류");
    }
  };

  const leave = async () => {
    if (!playerId) return;
    try {
      await fetch(`/api/rooms/${roomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
    } catch {
      /* best effort */
    }
    sessionStorage.removeItem(storageKey(roomId));
  };

  return {
    room,
    playerId,
    error,
    loading,
    start,
    answer,
    rematch,
    leave,
    refresh: fetchRoom,
  };
}

export function savePlayerId(roomId: string, playerId: string) {
  sessionStorage.setItem(storageKey(roomId), playerId);
}
