type TransferCancellation = {
  confirmNbr?: string;
  reservationStatus?: 'CANCELLED' | 'CONFIRMED';
};

export type OrderingTransferCancellationResult = {
  data: TransferCancellation;
};
