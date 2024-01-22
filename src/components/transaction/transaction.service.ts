import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  TransactionViaAccountNumberDto,
  TransactionViaPhoneDto,
} from './dto/transaction.dto';
import { TransactionRepository } from 'src/repos/transaction.repo';
import { AccountRepository } from 'src/repos/account.repo';
import { TransactionMessages } from './transaction.assets';
import { isValidObjectID } from 'src/helpers/idValidator';
@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
  ) {}
  async sendMoney(
    sendMoneyDto: TransactionViaPhoneDto | TransactionViaAccountNumberDto,
  ) {
    let sender;
    let receiver;

    if (sendMoneyDto instanceof TransactionViaPhoneDto) {
      const senderAccount = await this.accountRepository.getBy({
        phoneNumber: sendMoneyDto.sender,
      });
      const reciverAccount = await this.accountRepository.getBy({
        phoneNumber: sendMoneyDto.sender,
      });
      if (!senderAccount) {
        throw new HttpException('sender user not found', HttpStatus.NOT_FOUND);
      }
      if (!reciverAccount) {
        throw new HttpException('reciver user not found', HttpStatus.NOT_FOUND);
      }
      await this.accountRepository.checkBalance(
        senderAccount,
        reciverAccount,
        sendMoneyDto,
      );
      sender = await this.accountRepository.getBy({
        phoneNumber: sendMoneyDto.sender,
      });
      receiver = await this.accountRepository.getBy({
        phoneNumber: sendMoneyDto.receiver,
      });
    } else if (sendMoneyDto instanceof TransactionViaAccountNumberDto) {
      const senderAccount = await this.accountRepository.getBy({
        accountNumber: sendMoneyDto.sender,
      });
      const reciverAccount = await this.accountRepository.getBy({
        accountNumber: sendMoneyDto.sender,
      });
      if (!senderAccount) {
        throw new HttpException('sender user not found', HttpStatus.NOT_FOUND);
      }
      if (!reciverAccount) {
        throw new HttpException('reciver user not found', HttpStatus.NOT_FOUND);
      }

      await this.accountRepository.checkBalance(
        senderAccount,
        reciverAccount,
        sendMoneyDto,
      );

      sender = await this.accountRepository.getBy({
        accountNumber: sendMoneyDto.sender,
      });
      receiver = await this.accountRepository.getBy({
        accountNumber: sendMoneyDto.receiver,
      });
    } else {
      throw new HttpException(
        'Invalid transaction type',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newTransaction =
      await this.transactionRepository.newTransaction(sendMoneyDto);
    const transaction = await this.accountRepository.addTransactionToAccounts(
      sender,
      receiver,
      newTransaction,
    );

    return transaction;
  }

  async transactinStatus({
    transaction,
    status,
  }: {
    transaction: TransactionViaPhoneDto | TransactionViaAccountNumberDto;
    status: string;
  }): Promise<TransactionViaPhoneDto | TransactionViaAccountNumberDto> {
    transaction.status = status;

    const updatedTransaction =
      await this.transactionRepository.updateTransaction(transaction);
    if (!updatedTransaction) {
      throw new HttpException(
        'doesnt  updated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return updatedTransaction;
  }

  async getTransactionById(
    id: string,
  ): Promise<TransactionViaPhoneDto | TransactionViaAccountNumberDto> {
    if (!isValidObjectID(id)) {
      throw new HttpException('Invalid Object ID', HttpStatus.BAD_REQUEST);
    }
    const transaction = await this.transactionRepository.getTransactionById(id);
    if (!transaction) {
      throw new HttpException(
        TransactionMessages.TRANSACTION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return transaction;
  }

  async addTransactionToAccounts({
    transaction,
    status = 'pending',
  }: {
    transaction: TransactionViaPhoneDto | TransactionViaAccountNumberDto;
    status?: string;
  }) {
    if (transaction instanceof TransactionViaPhoneDto) {
      const sender = await this.accountRepository.getBy({
        phoneNumber: transaction.sender,
      });
      const reciver = await this.accountRepository.getBy({
        phoneNumber: transaction.receiver,
      });
      if (!sender) {
        throw new HttpException(
          'Sender User Is Not Found',
          HttpStatus.NOT_FOUND,
        );
      }
      if (!reciver) {
        throw new HttpException(
          'Reciver User Is Not Found',
          HttpStatus.NOT_FOUND,
        );
      }
      await this.accountRepository.checkBalance(sender, reciver, transaction);
      await this.accountRepository.addTransactionToAccounts(
        sender,
        reciver,
        transaction,
        status,
      );
    }
    if (transaction instanceof TransactionViaAccountNumberDto) {
      const sender = await this.accountRepository.getBy({
        accountNumber: transaction.sender,
      });
      const reciver = await this.accountRepository.getBy({
        accountNumber: transaction.receiver,
      });
      if (!sender) {
        throw new HttpException(
          'Sender User Is Not Found',
          HttpStatus.NOT_FOUND,
        );
      }
      if (!reciver) {
        throw new HttpException(
          'Reciver User Is Not Found',
          HttpStatus.NOT_FOUND,
        );
      }
      await this.accountRepository.checkBalance(sender, reciver, transaction);
      await this.accountRepository.addTransactionToAccounts(
        sender,
        reciver,
        transaction,
        status,
      );
    }
  }

  async getAllTransactions(id: string) {
    if (!isValidObjectID(id)) {
      throw new HttpException('Invalid Object ID', HttpStatus.BAD_REQUEST);
    }
    const user = this.accountRepository.getBy({ _id: id });
    if (!user) {
      throw new HttpException('user Not Found', HttpStatus.NOT_FOUND);
    }
    const transactions =
      await this.transactionRepository.getAllTransactionsForUser(id);
    if (transactions.length == 0) {
      throw new HttpException(
        'You Dont Have Any Transactions',
        HttpStatus.NOT_FOUND,
      );
    }
    return transactions;
  }
}
