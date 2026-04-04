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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const categories = transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    setCategory(categories[0]);
  }, [transactionType]);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    if (!isLoading && transactions.length >= 0) {
      saveTransactions();
    }
  }, [transactions]);

  const loadTransactions = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTransactions(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Error loading:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTransactions = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.log('Error saving:', error);
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
    setTransactions(prev => prev.filter(t => t.id !== id));
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
          onPress: async () => {
            setTransactions([]);
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
            } catch (error) {
              console.log('Error clearing:', error);
            }
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
      <View style={styles.transactionLeft}>
        <View style={[styles.categoryIcon, { backgroundColor: item.type === 'income' ? '#e8f5e9' : '#ffebee' }]}>
          <Text style={styles.categoryIconText}>
            {item.type === 'income' ? '📥' : '📤'}
          </Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.amount,
          { color: item.type === 'income' ? '#4CAF50' : '#FF5252' }
        ]}>
          {item.type === 'income' ? '+' : '-'}€{item.amount.toFixed(2)}
        </Text>
        <TouchableOpacity 
          onPress={() => handleDeleteTransaction(item.id)}
          style={styles.deleteIconBtn}
        >
          <Text style={styles.deleteIcon}>×</Text>
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
            <Text style={styles.summaryTitle}>Expenses</Text>
            {Object.entries(spendingByCategory).map(([cat, amount]) =>
              amount > 0 && (
                <View key={cat} style={styles.summaryRow}>
                  <Text style={styles.summaryCategory}>{cat}</Text>
                  <View style={styles.summaryRightContainer}>
                    <View style={[styles.summaryBar, { width: `${(amount / maxExpense) * 100}%` }]} />
                    <Text style={styles.summaryAmount}>€{amount.toFixed(2)}</Text>
                  </View>
                </View>
              )
            )}
          </>
        )}

        {Object.values(incomeByCategory).some(v => v > 0) && (
          <>
            <Text style={[styles.summaryTitle, { marginTop: 30 }]}>Income</Text>
            {Object.entries(incomeByCategory).map(([cat, amount]) =>
              amount > 0 && (
                <View key={cat} style={styles.summaryRow}>
                  <Text style={styles.summaryCategory}>{cat}</Text>
                  <View style={styles.summaryRightContainer}>
                    <View style={[styles.summaryBar, { backgroundColor: '#4CAF50', width: `${(amount / maxIncome) * 100}%` }]} />
                    <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>€{amount.toFixed(2)}</Text>
                  </View>
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerSubtitle}>Total Balance</Text>
            <Text style={[styles.headerBalance, { color: totalBalance >= 0 ? '#1a1a1a' : '#FF5252' }]}>
              €{totalBalance.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity onPress={clearAllTransactions} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabActiveText]}>
            Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabActiveText]}>
            Summary
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Transaction Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Type</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeBtn, transactionType === 'income' && styles.typeActive]}
              onPress={() => setTransactionType('income')}
            >
              <Text style={[styles.typeBtnText, transactionType === 'income' && styles.typeActiveText]}>
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, transactionType === 'expense' && styles.typeActive]}
              onPress={() => setTransactionType('expense')}
            >
              <Text style={[styles.typeBtnText, transactionType === 'expense' && styles.typeActiveText]}>
                Expense
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#ccc"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryButtons}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryBtnText, category === cat && styles.categoryBtnActiveText]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date</Text>
          <View style={styles.datePickerContainer}>
            <TouchableOpacity 
              style={styles.dateNavBtn}
              onPress={() => handleDateChange(-1)}
            >
              <Text style={styles.dateNavBtnText}>←</Text>
            </TouchableOpacity>
            
            <View style={styles.dateDisplay}>
              <Text style={styles.dateText}>{selectedDate.toLocaleDateString()}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.dateNavBtn}
              onPress={() => handleDateChange(1)}
            >
              <Text style={styles.dateNavBtnText}>→</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.todayBtn}
            onPress={() => setSelectedDate(new Date())}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Add Button */}
        <TouchableOpacity style={styles.addBtn} onPress={addTransaction}>
          <Text style={styles.addBtnText}>Add Transaction</Text>
        </TouchableOpacity>

        {/* Transactions or Summary */}
        {activeTab === 'transactions' ? (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>{transactions.length} transactions</Text>
            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>No transactions yet</Text>
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
            <Text style={styles.listTitle}>Breakdown</Text>
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
    backgroundColor: '#fafafa',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  headerBalance: {
    fontSize: 36,
    fontWeight: '700',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 24,
    color: '#1a1a1a',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabActiveText: {
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  typeBtnText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#666',
    fontSize: 14,
  },
  typeActiveText: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryBtnActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  categoryBtnText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 13,
  },
  categoryBtnActiveText: {
    color: '#fff',
  },
  datePickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  dateNavBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateNavBtnText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  todayBtn: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  addBtn: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 30,
  },
  addBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  listSection: {
    marginBottom: 30,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  deleteIconBtn: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 24,
    color: '#ccc',
    fontWeight: '300',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  summaryCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  summaryRightContainer: {
    marginTop: 8,
  },
  summaryBar: {
    height: 4,
    backgroundColor: '#FF5252',
    borderRadius: 2,
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5252',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    color: '#ccc',
    fontSize: 14,
    paddingVertical: 32,
  },
});