import { toast as sonnerToast } from 'sonner';
import { filterBannedWords } from '../utils/wordFilter';

const filter = (message: any) => {
  if (typeof message === 'string') {
    return filterBannedWords(message);
  }
  return message;
};

export const toast = {
  success: (message: any, options?: any) => sonnerToast.success(filter(message), options),
  error: (message: any, options?: any) => sonnerToast.error(filter(message), options),
  info: (message: any, options?: any) => sonnerToast.info(filter(message), options),
  warning: (message: any, options?: any) => sonnerToast.warning(filter(message), options),
  loading: (message: any, options?: any) => sonnerToast.loading(filter(message), options),
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
  custom: sonnerToast.custom,
};
