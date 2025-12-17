export const getISTDate = (): Date => {
  const now = new Date();
  const utcOffset = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60 * 1000; // +5:30
  return new Date(utcOffset + istOffset);
};

export const getISTDateString = (): string => {
  return getISTDate().toISOString().split('T')[0];
};

export const isFutureDate = (dateStr: string): boolean => {
  const today = getISTDate();
  today.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(dateStr);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate > today;
};

export const isTodayDate = (dateStr: string): boolean => {
  return dateStr === getISTDateString();
};

export const isYesterdayDate = (dateStr: string): boolean => {
  const today = getISTDate();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const checkDate = new Date(dateStr);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate.getTime() === yesterday.getTime();
};
