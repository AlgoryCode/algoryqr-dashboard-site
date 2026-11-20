"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCustomer, formatTl, searchCustomers, type DeviceCustomer } from "@/lib/console-api";

/** Looks like a phone number rather than a name. */
function looksLikePhone(text: string) {
  return /^[0-9+()\s-]{7,}$/.test(text);
}

/**
 * Search the customer cards by name or phone and pick one. When nothing matches, the typed name (or phone) can be
 * saved as a new card on the spot.
 */
export function CustomerPicker({
  selected,
  onSelect,
}: {
  selected: DeviceCustomer | null;
  onSelect: (customer: DeviceCustomer | null) => void;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [newName, setNewName] = useState("");
  const create = useMutation({
    mutationFn: (payload: { name: string; phone?: string }) => createCustomer(payload),
    onSuccess: async (customer) => {
      setQuery("");
      setNewName("");
      onSelect(customer);
      await queryClient.invalidateQueries({ queryKey: ["device-customers"] });
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useQuery({
    queryKey: ["device-customers", "picker", debounced],
    queryFn: () => searchCustomers(debounced, 0, 6),
    enabled: debounced.length >= 2,
  });

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
        <div>
          <p className="font-medium text-foreground">{selected.name}</p>
          <p className="text-xs text-muted-foreground">
            {selected.phone ?? "Telefon yok"} · Bakiye {formatTl(selected.balance)}
            {selected.freeMinutes > 0 ? ` · ${selected.freeMinutes} dk ücretsiz` : ""}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
          Kaldır
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        value={query}
        placeholder="Müşteri kartı ara: ad veya telefon"
        onChange={(event) => setQuery(event.target.value)}
      />
      {debounced.length >= 2 ? (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          {results.isLoading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Aranıyor…</p>
          ) : (results.data?.content ?? []).length === 0 ? (
            <div className="space-y-2 px-3 py-2 text-xs text-muted-foreground">
              <p>Kart bulunamadı. Yeni kart açın:</p>
              <div className="flex gap-2">
                <Input
                  className="h-8"
                  placeholder="Ad"
                  value={looksLikePhone(debounced) ? newName : newName || debounced}
                  onChange={(event) => setNewName(event.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={create.isPending}
                  onClick={() => {
                    const phone = looksLikePhone(debounced) ? debounced : undefined;
                    const name = (newName || (phone ? "" : debounced)).trim();
                    if (name) create.mutate({ name, phone });
                  }}
                >
                  Ekle
                </Button>
              </div>
              {create.isError ? (
                <p className="text-destructive">
                  {create.error instanceof Error ? create.error.message : "Müşteri eklenemedi"}
                </p>
              ) : null}
            </div>
          ) : (
            (results.data?.content ?? []).map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onSelect(customer);
                  setQuery("");
                }}
              >
                <span className="font-medium text-foreground">{customer.name}</span>
                <span className="text-xs text-muted-foreground">
                  {customer.phone ?? ""} · {formatTl(customer.balance)}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
