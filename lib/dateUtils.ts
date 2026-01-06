export const calculateTimeAgo = (dateInput: string | number | Date): string => {
    const date = new Date(dateInput);
    const now = new Date();

    // Check for valid date
    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }

    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Less than a minute
    if (seconds < 60) {
        return 'Just now';
    }

    // Less than an hour
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours, show hours
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }

    // Days calculation (Calendar based to match the displayed date)
    // We strip time to avoid "19 days ago" for something that was 20 calendar days ago but 1 hour shy of 24h multiples
    const dateMidnight = new Date(date);
    dateMidnight.setHours(0, 0, 0, 0);
    const nowMidnight = new Date(now);
    nowMidnight.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(nowMidnight.getTime() - dateMidnight.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;

    // Months
    const months = Math.floor(diffDays / 30);
    if (months < 12) {
        return `${months} month${months !== 1 ? 's' : ''} ago`;
    }

    // Years
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
};
