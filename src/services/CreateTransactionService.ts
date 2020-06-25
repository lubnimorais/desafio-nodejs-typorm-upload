import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categortRepository = getRepository(Category);

    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('Tipo de transação inválida.');
    }

    if (type === 'outcome') {
      const balance = await transactionsRepository.getBalance();

      if (value > balance.total) {
        throw new AppError('O valor que existe não é suficiente.');
      }
    }

    let categoryExists = await categortRepository.findOne({
      title: category,
    });

    if (!categoryExists) {
      categoryExists = categortRepository.create({
        title: category,
      });

      await categortRepository.save(categoryExists);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      category: categoryExists.title,
      category_id: categoryExists.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
