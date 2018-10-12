interface Accepted<T> {
    readonly cancelled: false;
    readonly value: T;
}

interface Cancelled {
    readonly cancelled: true;
}

export const cancelled: Cancelled = { cancelled: true };

export function accepted<T>(value: T): Cancellable<T> {
    return { cancelled: false, value: value };
}

export type Cancellable<T> = Accepted<T> | Cancelled;
