export  const isActive = (href: string, pathname: string) => {
    const base = href.split("?")[0];
    return pathname === href || pathname === base;
};