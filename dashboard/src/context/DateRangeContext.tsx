import React, { createContext, useContext, useState } from "react";

export interface DateRange {
    startDate: string | undefined;
    endDate: string | undefined;
}

interface DateRangeContextType {
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
}

const DateRangeContext = createContext<DateRangeContextType>({
    dateRange: { startDate: undefined, endDate: undefined },
    setDateRange: () => { },
});

export const DateRangeProvider = ({ children }: { children: React.ReactNode }) => {
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: undefined,
        endDate: undefined,
    });

    return (
        <DateRangeContext.Provider value={{ dateRange, setDateRange }}>
            {children}
        </DateRangeContext.Provider>
    );
};

export const useDateRange = () => useContext(DateRangeContext);
