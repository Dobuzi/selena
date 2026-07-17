"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientRoom } from "@/lib/room-view";

function storageKey(roomId: string) {
  return `selena:playerId:${roomId}`;
}

export function useRoomSession(roomId: string) {
  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const esRef = useRef<EventSource | null>(null);

  const applyRoom = useCallback((r: ClientRoom) => {
    setRoom(r);
    setError(null);
  }, []);

  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms/${roomId}`);
    if (!res.ok) {
      setError("시험장이 없어요.");
      setRoom(null);
      return;
    }
    const data = await res.json();
    applyRoom(data.room);
  }, [roomId, applyRoom]);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? sessionStorage.getItem(storageKey(roomId))
        : null;
    setPlayerId(stored);

    let cancelled = false;

    (async () => {
      if (stored) {
        await fetch(`/api/rooms/${roomId}/reconnect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: stored }),
        });
      }
      if (cancelled) return;
      await fetchRoom();
      setLoading(false);
    })();

    const es = new EventSource(`/api/rooms/${roomId}/events`);
    esRef.current = es;
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
        /* ignore */
      }
    };
    es.onerror = () => {
      /* poll fallback */
    };

    const poll = setInterval(() => {
      void fetchRoom();
    }, 2000);

    return () => {
      cancelled = true;
      es.close();
      clearInterval(poll);
    };
  }, [roomId, fetchRoom, applyRoom]);

  const start = async () => {
    if (!playerId) return;
    const res = await fetch(`/api/rooms/${roomId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "시작 실패");
      return;
    }
    applyRoom(data.room);
  };

  const answer = async (choiceIndex: number | null) => {
    if (!playerId) return;
    const res = await fetch(`/api/rooms/${roomId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, choiceIndex }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "제출 실패");
      return;
    }
    applyRoom(data.room);
  };

  const rematch = async () => {
    if (!playerId) return;
    const res = await fetch(`/api/rooms/${roomId}/rematch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "다시 하기 실패");
      return;
    }
    applyRoom(data.room);
  };

  const leave = async () => {
    if (!playerId) return;
    await fetch(`/api/rooms/${roomId}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
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
