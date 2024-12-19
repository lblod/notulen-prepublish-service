export default class AppError extends Error {
  status;
  isOperational;

  /** @param {number} [status] */
  constructor(status, message = '', isOperational = true) {
    super(message);
    this.status = status;
    this.isOperational = isOperational;
  }
}

/** @param {Error} error */
export function isOperational(error) {
  return error instanceof AppError && error.isOperational;
}
