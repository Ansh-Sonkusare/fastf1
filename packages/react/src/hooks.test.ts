import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAsyncResource } from "./hooks";

describe("useAsyncResource", () => {
  it("should not call load when initialData is provided", () => {
    const load = vi.fn().mockResolvedValue("server");

    const { result } = renderHook(() => useAsyncResource(load, "initial"));

    expect(load).not.toHaveBeenCalled();
    expect(result.current.data).toBe("initial");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should toggle loading state and resolve data on success", async () => {
    const load = vi.fn().mockResolvedValue("done");

    const { result } = renderHook(() => useAsyncResource(load));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBe("done");
    expect(result.current.error).toBeNull();
  });

  it("should set error state when load fails", async () => {
    const load = vi.fn().mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useAsyncResource(load));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(new Error("boom"));
  });

  it("should preserve null data returned by load", async () => {
    const load = vi.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useAsyncResource(load));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should prevent stale updates from an outdated run", async () => {
    let resolveFirst!: (value: string) => void;
    const first = vi.fn().mockReturnValue(
      new Promise<string>((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const second = vi.fn().mockResolvedValue("second");

    const { result, rerender } = renderHook(({ load }) => useAsyncResource(load), {
      initialProps: { load: first },
    });

    rerender({ load: second });

    await waitFor(() => expect(result.current.data).toBe("second"));

    act(() => {
      resolveFirst("first");
    });

    expect(result.current.data).toBe("second");
    expect(result.current.error).toBeNull();
  });
});
