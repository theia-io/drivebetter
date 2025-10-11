export function todayDateInput(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function currentHourTimeInput(): string {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    return `${hh}:00`;
}
