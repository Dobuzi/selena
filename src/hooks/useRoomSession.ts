"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientRoom } from "@/lib/room-view";
import { fetchWithTimeout, readJson } from "@/lib/client-fetch";

function storageKey(roomId: string) {
  return `selena:playerId:${roomId}`;
}

export function useRoomSession(roomId: string) {
  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [rematching, setRematching] = useState(false);
  const playerIdRef = useRef<string | null>(null);

  const applyRoom = useCallback((r: ClientRoom) => {
    setRoom(r);
    setError(null);
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const pid = playerIdRef.current;
      const qs = pid ? `?playerId=${encodeURIComponent(pid)}` : "";
      const res = await fetchWithTimeout(`/api/rooms/${roomId}${qs}`, {
        cache: "no-store",
        timeoutMs: 8_000,
      });
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
          await fetchWithTimeout(`/api/rooms/${roomId}/reconnect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId: stored }),
            timeoutMs: 8_000,
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
    if (!playerId || starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(`/api/rooms/${roomId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        timeoutMs: 20_000,
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(String(data.message ?? "시작 실패"));
        return;
      }
      applyRoom(data.room as ClientRoom);
    } catch (e) {
      setError(e instanceof Error ? e.message : "시작 중 네트워크 오류");
    } finally {
      setStarting(false);
    }
  };

  const answer = async (choiceIndex: number | null) => {
    if (!playerId || answering) return;
    setAnswering(true);
    try {
      const res = await fetchWithTimeout(`/api/rooms/${roomId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, choiceIndex }),
        timeoutMs: 10_000,
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(String(data.message ?? "제출 실패"));
        return;
      }
      applyRoom(data.room as ClientRoom);
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출 중 네트워크 오류");
    } finally {
      setAnswering(false);
    }
  };

  const rematch = async () => {
    if (!playerId || rematching) return;
    setRematching(true);
    try {
      const res = await fetchWithTimeout(`/api/rooms/${roomId}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        timeoutMs: 10_000,
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(String(data.message ?? "다시 하기 실패"));
        return;
      }
      applyRoom(data.room as ClientRoom);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 하기 중 네트워크 오류");
    } finally {
      setRematching(false);
    }
  };

  const leave = async () => {
    if (!playerId) return;
    try {
      await fetchWithTimeout(`/api/rooms/${roomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        timeoutMs: 5_000,
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
    starting,
    answering,
    rematching,
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
