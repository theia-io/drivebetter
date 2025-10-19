export type PageResp<T> = {
    items: T[];
    page: number;
    limit: number;
    total: number;
    pages: number;
};