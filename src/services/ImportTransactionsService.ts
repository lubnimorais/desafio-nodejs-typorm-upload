import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, getCustomRepository, In } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(fileCSV: string): Promise<Transaction[]> {
    const constactsReadStream = fs.createReadStream(fileCSV);
    const categoryRepository = getRepository(Category);
    const transationsRepository = getCustomRepository(TransactionsRepository);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = constactsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((l: string) => l.trim());

      if (!title || !value || !type) return;

      categories.push(category);
      transactions.push({ title, value, type, category });
    });

    await new Promise(resolved => {
      parseCSV.on('end', resolved);
    });

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    console.log(transactions);

    const newTransactions = transactions.map(trs => ({
      title: trs.title,
      value: trs.value,
      type: trs.type,
      category: finalCategories.find(cat => cat.title === trs.title),
    }));

    const createdTransations = transationsRepository.create(newTransactions);

    await transationsRepository.save(createdTransations);

    await fs.promises.unlink(fileCSV);

    return createdTransations;
  }
}

export default ImportTransactionsService;
