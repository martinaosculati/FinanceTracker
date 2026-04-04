import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Bills', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Bonus', 'Bank Transfer', 'Other'];
const STORAGE_KEY = '@financeApp_transactions';

export default function FinanceApp() {
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [transactionType, setTransactionType] = useState('expense');
  const [activeTab, setActiveTab] = useState('transactions');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const categories = transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    setCategory(categories[0]);
  }, [transactionType]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveData();
    }
  }, [transactions]);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTransactions(JSON.parse(saved));
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading:', error);
      setIsLoading(false);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const addTransaction = () => {
    if (!amount || isNaN(amount)) {
      Alert.alert('Invalid Input', 'Please enter a valid amount');
      return;
    }

    const newTransaction = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category,
      type: transactionType,
      date: selectedDate.toLocaleDateString(),
    };

    setTransactions(prev => [newTransaction, ...prev]);
    setAmount('');
    setCategory(categories[0]);
    setSelectedDate(new Date());
  };

  const handleDeleteTransaction = (id) => {
    console.log('Deleting transaction with id:', id);
    const updated = transactions.filter(t => t.id !== id);
    console.log('Updated transactions:', updated.length);
    setTransactions(updated);
  };

  const clearAllTransactions = () => {
    Alert.alert(
      'Clear All',
      'Delete ALL transactions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            setTransactions([]);
            AsyncStorage.removeItem(STORAGE_KEY);
          },
        },
      ]
    );
  };

  const totalBalance = transactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount;
  }, 0);

  const getSpendingByCategory = () => {
    const spending = {};
    EXPENSE_CATEGORIES.forEach(cat => {
      spending[cat] = transactions
        .filter(t => t.category === cat && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    });
    return spending;
  };

  const getIncomeByCategory = () => {
    const income = {};
    INCOME_CATEGORIES.forEach(cat => {
      income[cat] = transactions
        .filter(t => t.category === cat && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    });
    return income;
  };

  const spendingByCategory = getSpendingByCategory();
  const incomeByCategory = getIncomeByCategory();

  const handleDateChange = (daysOffset) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + daysOffset);
    setSelectedDate(newDate);
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionInfo}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[
          styles.amount,
          { color: item.type === 'income' ? '#4CAF50' : '#FF5252' }
        ]}>
          {item.type === 'income' ? '+' : '-'}€{item.amount.toFixed(2)}
        </Text>
        <TouchableOpacity 
          style={styles.deleteBtn} 
          onPress={() => {
            console.log('Delete button pressed for:', item.id);
            handleDeleteTransaction(item.id);
          }}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategorySummary = () => {
    const maxExpense = Math.max(...Object.values(spendingByCategory), 1);
    const maxIncome = Math.max(...Object.values(incomeByCategory), 1);

    return (
      <View>
        {Object.values(spendingByCategory).some(v => v > 0) && (
          <>
            <Text style={[styles.summaryTitle, { color: '#FF5252' }]}>💸 Expenses</Text>
            {Object.entries(spendingByCategory).map(([cat, amount]) =>
              amount > 0 && (
                <View key={cat} style={styles.summaryRow}>
                  <Text style={styles.summaryCategory}>{cat}</Text>
                  <Text style={styles.summaryAmount}>-€{amount.toFixed(2)}</Text>
                  <View style={[styles.summaryBar, { width: `${(amount / maxExpense) * 100}%` }]} />
                </View>
              )
            )}
          </>
        )}

        {Object.values(incomeByCategory).some(v => v > 0) && (
          <>
            <Text style={[styles.summaryTitle, { marginTop: 25, color: '#4CAF50' }]}>💵 Income</Text>
            {Object.entries(incomeByCategory).map(([cat, amount]) =>
              amount > 0 && (
                <View key={cat} style={styles.summaryRow}>
                  <Text style={styles.summaryCategory}>{cat}</Text>
                  <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>+€{amount.toFixed(2)}</Text>
                  <View style={[styles.summaryBar, { backgroundColor: '#4CAF50', width: `${(amount / maxIncome) * 100}%` }]} />
                </View>
              )
            )}
          </>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>💰 Finance Tracker</Text>
          <TouchableOpacity onPress={clearAllTransactions}>
            <Text style={styles.clearBtn}>🗑️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={[styles.balance, { color: totalBalance >= 0 ? '#4CAF50' : '#FF5252' }]}>
            €{totalBalance.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabActiveText]}>
            📝 Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabActiveText]}>
            📊 Summary
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeBtn, transactionType === 'income' && styles.typeActive]}
            onPress={() => setTransactionType('income')}
          >
            <Text style={[styles.typeBtnText, transactionType === 'income' && styles.typeActiveText]}>
              💵 Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, transactionType === 'expense' && styles.typeActive]}
            onPress={() => setTransactionType('expense')}
          >
            <Text style={[styles.typeBtnText, transactionType === 'expense' && styles.typeActiveText]}>
              💸 Expense
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryButtons}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryBtn, category === cat && styles.categoryActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryBtnText, category === cat && styles.categoryActiveText]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.datePickerContainer}>
            <TouchableOpacity 
              style={styles.dateNavBtn}
              onPress={() => handleDateChange(-1)}
            >
              <Text style={styles.dateNavBtnText}>◀</Text>
            </TouchableOpacity>
            
            <View style={styles.dateDisplay}>
              <Text style={styles.dateText}>{selectedDate.toLocaleDateString()}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.dateNavBtn}
              onPress={() => handleDateChange(1)}
            >
              <Text style={styles.dateNavBtnText}>▶</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.todayBtn}
            onPress={() => setSelectedDate(new Date())}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={addTransaction}>
          <Text style={styles.addBtnText}>+ Add Transaction</Text>
        </TouchableOpacity>

        {activeTab === 'transactions' ? (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Transactions ({transactions.length})</Text>
            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>No transactions yet!</Text>
            ) : (
              <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            )}
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Summary</Text>
            {renderCategorySummary()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearBtn: {
    fontSize: 24,
    padding: 5,
  },
  balanceBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  balanceLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabActiveText: {
    color: '#3498db',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  typeActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  typeBtnText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#666',
  },
  typeActiveText: {
    color: '#fff',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryActive: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  categoryBtnText: {
    color: '#666',
    fontWeight: '500',
  },
  categoryActiveText: {
    color: '#fff',
  },
  datePickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  dateNavBtn: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  dateNavBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  todayBtn: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3498db',
  },
  addBtn: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  addBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listSection: {
    marginBottom: 30,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  transactionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deleteBtn: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryRow: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  summaryCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF5252',
    marginBottom: 8,
  },
  summaryBar: {
    height: 6,
    backgroundColor: '#FF5252',
    borderRadius: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
});