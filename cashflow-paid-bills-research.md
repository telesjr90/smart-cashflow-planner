# Paid Bills Logic – Research Notes

## Search: paidBills

E:\cashflow-app\src\App.jsx:58:    paidBills = {},
E:\cashflow-app\src\App.jsx:146:    Object.entries(paidBills || {}).forEach(([key, isPaid]) => {
E:\cashflow-app\src\App.jsx:156:  }, [paidBills, safeStartDate]);
E:\cashflow-app\src\App.jsx:175:      paidBills,
E:\cashflow-app\src\App.jsx:187:      paidBills,
E:\cashflow-app\src\App.jsx:339:              paidBills={paidBills}
E:\cashflow-app\src\App.jsx:382:                paidBills: paidFlags,
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:496:    paidBills: paidBillsProp,
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:497:    setPaidBills: setPaidBillsProp,
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:643:  // Persisted non-planning state: paidBills & confirmedDiscretionary
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:644:  const [paidBillsLocal, setPaidBillsLocal] = useState({});
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:649:    paidBillsProp &&
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:650:    setPaidBillsProp &&
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:660:  const paidBills = usePropFacts ? paidBillsProp : paidBillsLocal;
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:661:  const setPaidBills = usePropFacts ? setPaidBillsProp : setPaidBillsLocal;
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:754:      setPaidBillsLocal(data.paidBills || {});
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:895:  const enginePaidBills = useMemo(() => paidBills || {}, [paidBills]);
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:1001:        paidBills: enginePaidBills,
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:1014:    enginePaidBills,
E:\cashflow-app\src\hooks\useCashflowData.js:43:  paidBills: {},
E:\cashflow-app\src\hooks\useCashflowData.js:246:  paidBills: state.paidBills,
E:\cashflow-app\src\hooks\useCashflowData.js:266:    paidBills: { ...emptyUserData.paidBills, ...(base.paidBills || {}) },
E:\cashflow-app\src\hooks\useCashflowData.js:979:      const map = { ...(base.paidBills || {}) };
E:\cashflow-app\src\hooks\useCashflowData.js:983:      setMyData({ ...base, paidBills: map });
E:\cashflow-app\src\hooks\useCashflowData.js:992:            const current = { ...(serverData.paidBills || {}) };
E:\cashflow-app\src\hooks\useCashflowData.js:996:              nextData: { ...serverData, paidBills: current },
E:\cashflow-app\src\hooks\useCashflowData.js:1022:      const optimisticMap = { ...(base.paidBills || {}) };
E:\cashflow-app\src\hooks\useCashflowData.js:1034:      setMyData({ ...base, paidBills: optimisticMap });
E:\cashflow-app\src\hooks\useCashflowData.js:1043:            const current = { ...(serverData.paidBills || {}) };
E:\cashflow-app\src\hooks\useCashflowData.js:1055:              nextData: { ...serverData, paidBills: current },
E:\cashflow-app\src\hooks\useCashflowSummary.js:19:  const paidBills = useCashflowStore((state) => state.paidBills || {});
E:\cashflow-app\src\hooks\useCashflowSummary.js:46:        paidBills,
E:\cashflow-app\src\hooks\useCashflowSummary.js:87:    paidBills,
E:\cashflow-app\src\hooks\useCashflowTimeline.js:44:  const paidBills = useCashflowStore((state) => state.paidBills || {});
E:\cashflow-app\src\hooks\useCashflowTimeline.js:70:        paidBills,
E:\cashflow-app\src\hooks\useCashflowTimeline.js:107:    paidBills,
E:\cashflow-app\src\hooks\useUpcomingBills.js:29:  const paidBills = useCashflowStore((state) => state.paidBills);
E:\cashflow-app\src\hooks\useUpcomingBills.js:53:        const isPaid = !!paidBills[key];
E:\cashflow-app\src\hooks\useUpcomingBills.js:79:  }, [bills, paidBills, daysLookahead, role, billSharing]);
E:\cashflow-app\src\lib\cashflow\projectCashflow.js:258:    paidBills: params.paidBills || {},
E:\cashflow-app\src\lib\cashflow\projectCashflow.js:277:  paidBills = {},
E:\cashflow-app\src\lib\cashflow\projectCashflow.js:375:  const safePaidBills = paidBills || {};
E:\cashflow-app\src\lib\cashflow\projectCashflow.js:390:      const isPaid = !!safePaidBills[key];
E:\cashflow-app\src\pages\Bills.jsx:324:    paidBills,
E:\cashflow-app\src\pages\Bills.jsx:356:    Object.entries(paidBills || {}).forEach(([key, isPaid]) => {
E:\cashflow-app\src\pages\Bills.jsx:366:  }, [paidBills, safeStartDate]);
E:\cashflow-app\src\pages\Home.jsx:42:export function computeBillsDueAmount({ bills = [], role = "H", billSharing, paidBills = {}, now = new Date() }) {
E:\cashflow-app\src\pages\Home.jsx:48:    const isPaid = !!paidBills?.[key];
E:\cashflow-app\src\pages\Home.jsx:83:  const paidBills = useCashflowStore((state) => state.paidBills || {});
E:\cashflow-app\src\pages\Home.jsx:156:        paidBills,
E:\cashflow-app\src\pages\Home.jsx:159:    [bills, role, billSharing, paidBills]
E:\cashflow-app\src\pages\Planner.jsx:128:        paidBills: infographicProps.paidBills || {},
E:\cashflow-app\src\store\useStore.js:40:  paidBills: {}, // "YYYY-MM-DD:billId": boolean
E:\cashflow-app\src\store\useStore.js:142:            "paidBills",
E:\cashflow-app\src\store\useStore.js:191:          const newMap = { ...state.paidBills };
E:\cashflow-app\src\store\useStore.js:194:          return { paidBills: newMap };
E:\cashflow-app\src\store\useStore.js:222:          paidBills: { ...state.paidBills },
E:\cashflow-app\src\store\useStore.js:269:          paidBills: persistedState.paidBills ?? currentState.paidBills,
E:\cashflow-app\src\store\selectors\billsSelectors.js:6:export const selectPaidBillsMap = (state) => state.paidBills || {};
E:\cashflow-app\src\store\selectors\billsSelectors.js:19:  const paidBills = state.paidBills || {};
E:\cashflow-app\src\store\selectors\billsSelectors.js:49:    const isPaid = !!paidBills[paidKey];
E:\cashflow-app\src\store\selectors\summarySelectors.js:29:      paidBills: state.paidBills || {},

## Search: set*Paid / togglePaid

E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:497:    setPaidBills: setPaidBillsProp,
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:644:  const [paidBillsLocal, setPaidBillsLocal] = useState({});
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:650:    setPaidBillsProp &&
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:661:  const setPaidBills = usePropFacts ? setPaidBillsProp : setPaidBillsLocal;
E:\cashflow-app\src\MonthlyCashFlowInfographic.jsx:754:      setPaidBillsLocal(data.paidBills || {});
E:\cashflow-app\src\hooks\useCashflowData.js:967:  const handleTogglePaid = useCallback(
E:\cashflow-app\src\hooks\useCashflowData.js:983:      setMyData({ ...base, paidBills: map });
E:\cashflow-app\src\hooks\useCashflowData.js:1003:        console.warn("Failed to toggle paid", err);
E:\cashflow-app\src\hooks\useCashflowData.js:1009:            retry: () => handleTogglePaid({ billId, monthIndex, next }),
E:\cashflow-app\src\hooks\useCashflowData.js:1034:      setMyData({ ...base, paidBills: optimisticMap });
E:\cashflow-app\src\hooks\useCashflowData.js:1310:    handleTogglePaid,
E:\cashflow-app\src\pages\Bills.jsx:223:function BulkActions({ disabled, onMarkAllPaid, onMarkAllUnpaid }) {
E:\cashflow-app\src\pages\Bills.jsx:227:      <Button variant="outline" size="sm" onClick={onMarkAllUnpaid}>
E:\cashflow-app\src\pages\Bills.jsx:228:        Mark all unpaid
E:\cashflow-app\src\pages\Bills.jsx:230:      <Button variant="primary" size="sm" onClick={onMarkAllPaid}>
E:\cashflow-app\src\pages\Bills.jsx:231:        Mark all paid
E:\cashflow-app\src\pages\Bills.jsx:334:    handleTogglePaid,
E:\cashflow-app\src\pages\Bills.jsx:654:    handleTogglePaid({
E:\cashflow-app\src\pages\Bills.jsx:858:                      aria-label={item.paid ? "Mark unpaid" : "Mark paid"}
E:\cashflow-app\src\pages\Bills.jsx:976:            onMarkAllPaid={() => handleBulk(true)}
E:\cashflow-app\src\pages\Bills.jsx:977:            onMarkAllUnpaid={() => handleBulk(false)}
E:\cashflow-app\src\store\useStore.js:188:      setPaidStatus: (billId, dateStr, isPaid) =>

## Search: Bills page references

E:\cashflow-app\src\pages\Accounts.jsx:26:  bills: propBills,
E:\cashflow-app\src\pages\Accounts.jsx:33:  const storeBills = useCashflowStore((state) => state.bills || []);
E:\cashflow-app\src\pages\Accounts.jsx:46:  const bills = propBills || storeBills;
E:\cashflow-app\src\pages\Accounts.jsx:85:      map[acc.id] = { bills: [], goals: [], budgets: [] };
E:\cashflow-app\src\pages\Accounts.jsx:88:    // Distribute Bills
E:\cashflow-app\src\pages\Accounts.jsx:89:    bills.forEach((bill) => {
E:\cashflow-app\src\pages\Accounts.jsx:90:      if (bill.accountId && map[bill.accountId]) {
E:\cashflow-app\src\pages\Accounts.jsx:91:        map[bill.accountId].bills.push(bill);
E:\cashflow-app\src\pages\Accounts.jsx:111:  }, [myAccounts, bills, goals, budgets]);
E:\cashflow-app\src\pages\Accounts.jsx:124:            Add an account to start tracking your bills, goals, and budgets.
E:\cashflow-app\src\pages\Accounts.jsx:154:          const data = groupedData[account.id] || { bills: [], goals: [], budgets: [] };
E:\cashflow-app\src\pages\Accounts.jsx:156:          const hasBills = data.bills.length > 0;
E:\cashflow-app\src\pages\Accounts.jsx:159:          const hasAnyLinks = hasBills || hasGoals || hasBudgets;
E:\cashflow-app\src\pages\Accounts.jsx:222:                  {/* Bills Column (keep even if empty via Section rules below) */}
E:\cashflow-app\src\pages\Accounts.jsx:224:                    title="Linked Bills"
E:\cashflow-app\src\pages\Accounts.jsx:226:                    count={data.bills.length}
E:\cashflow-app\src\pages\Accounts.jsx:227:                    items={data.bills}
E:\cashflow-app\src\pages\Accounts.jsx:309:                  <span>No bills, goals, or budgets are currently linked to this account.</span>
E:\cashflow-app\src\pages\Accounts.jsx:313:              {/* If there are links but Goals/Budgets are empty and Bills is present,
E:\cashflow-app\src\pages\Bills.jsx:1:// src/pages/Bills.jsx
E:\cashflow-app\src\pages\Bills.jsx:17:import BillFormSheet from "../components/bills/BillFormSheet";
E:\cashflow-app\src\pages\Bills.jsx:30:  getScopedBillAmount,
E:\cashflow-app\src\pages\Bills.jsx:31:  isBillVisibleInSelfScope,
E:\cashflow-app\src\pages\Bills.jsx:32:} from "../lib/billSharing";
E:\cashflow-app\src\pages\Bills.jsx:154:function PastDueBanner({ items, memberNames, bannerLabel, role, billSharing }) {
E:\cashflow-app\src\pages\Bills.jsx:169:            {items.length} overdue bill{items.length > 1 ? "s" : ""}{" "}
E:\cashflow-app\src\pages\Bills.jsx:191:                  getScopedBillAmount({
E:\cashflow-app\src\pages\Bills.jsx:192:                    bill: it,
E:\cashflow-app\src\pages\Bills.jsx:194:                    billSharing,
E:\cashflow-app\src\pages\Bills.jsx:203:                      getScopedBillAmount({ bill: it, role, billSharing }) - raw
E:\cashflow-app\src\pages\Bills.jsx:264:      aria-label="Bill actions"
E:\cashflow-app\src\pages\Bills.jsx:316:export default function Bills({ personScope = "self", isOnline = true }) {
E:\cashflow-app\src\pages\Bills.jsx:320:    bills,
E:\cashflow-app\src\pages\Bills.jsx:324:    paidBills,
E:\cashflow-app\src\pages\Bills.jsx:325:    billSharing,
E:\cashflow-app\src\pages\Bills.jsx:333:    handleUpdateBills,
E:\cashflow-app\src\pages\Bills.jsx:336:    handleChangeBillAccount,
E:\cashflow-app\src\pages\Bills.jsx:352:  const billsArr = Array.isArray(bills) ? bills : [];
E:\cashflow-app\src\pages\Bills.jsx:356:    Object.entries(paidBills || {}).forEach(([key, isPaid]) => {
E:\cashflow-app\src\pages\Bills.jsx:358:      const [dateStr, billId] = key.split(":");
E:\cashflow-app\src\pages\Bills.jsx:359:      if (!dateStr || !billId) return;
E:\cashflow-app\src\pages\Bills.jsx:362:      if (!flags[billId]) flags[billId] = {};
E:\cashflow-app\src\pages\Bills.jsx:363:      flags[billId][monthIndex] = true;
E:\cashflow-app\src\pages\Bills.jsx:366:  }, [paidBills, safeStartDate]);
E:\cashflow-app\src\pages\Bills.jsx:369:  const [editingBill, setEditingBill] = useState(null);
E:\cashflow-app\src\pages\Bills.jsx:403:  const categoryLabelForBill = useMemo(
E:\cashflow-app\src\pages\Bills.jsx:404:    () => (bill) => {
E:\cashflow-app\src\pages\Bills.jsx:405:      if (bill.category && budgetOptions.some((b) => b.key === bill.category)) {
E:\cashflow-app\src\pages\Bills.jsx:406:        const found = budgetOptions.find((b) => b.key === bill.category);
E:\cashflow-app\src\pages\Bills.jsx:409:      if (bill.category) {
E:\cashflow-app\src\pages\Bills.jsx:410:        return getCategoryLabel(bill.category) || bill.category;
E:\cashflow-app\src\pages\Bills.jsx:425:  const resolveAccountId = (bill) => {
E:\cashflow-app\src\pages\Bills.jsx:426:    if (!hasAccounts) return bill.accountId || "";
E:\cashflow-app\src\pages\Bills.jsx:427:    if (bill.accountId && accountMap[bill.accountId]) return bill.accountId;
E:\cashflow-app\src\pages\Bills.jsx:437:    setEditingBill(null);
E:\cashflow-app\src\pages\Bills.jsx:441:  const handleOpenEdit = (bill) => {
E:\cashflow-app\src\pages\Bills.jsx:443:    setEditingBill(bill);
E:\cashflow-app\src\pages\Bills.jsx:449:    setEditingBill(null);
E:\cashflow-app\src\pages\Bills.jsx:452:  const handleSaveBill = async (billDraft) => {
E:\cashflow-app\src\pages\Bills.jsx:456:      const name = (billDraft.name || "").trim();
E:\cashflow-app\src\pages\Bills.jsx:458:        showToast({ type: "error", message: "Bill name is required." });
E:\cashflow-app\src\pages\Bills.jsx:462:      const cleanAmount = Number.isFinite(+billDraft.amount) ? +billDraft.amount : 0;
E:\cashflow-app\src\pages\Bills.jsx:464:        showToast({ type: "error", message: "Bill amount must be greater than zero." });
E:\cashflow-app\src\pages\Bills.jsx:468:      const cleanDueDay = Math.min(31, Math.max(1, parseInt(billDraft.dueDay || 1, 10)));
E:\cashflow-app\src\pages\Bills.jsx:469:      const accountId = resolveAccountId({ ...billDraft, dueDay: cleanDueDay });
E:\cashflow-app\src\pages\Bills.jsx:470:      const categoryKey = billDraft.category || budgetOptions[0]?.key || null;
E:\cashflow-app\src\pages\Bills.jsx:472:      let nextBills;
E:\cashflow-app\src\pages\Bills.jsx:474:      if (!editingBill) {
E:\cashflow-app\src\pages\Bills.jsx:476:          billDraft.id ||
E:\cashflow-app\src\pages\Bills.jsx:477:          `${(billDraft.name || "bill")
E:\cashflow-app\src\pages\Bills.jsx:481:        const newBill = {
E:\cashflow-app\src\pages\Bills.jsx:486:          payer: billDraft.payer || role,
E:\cashflow-app\src\pages\Bills.jsx:490:        nextBills = [...bills, newBill];
E:\cashflow-app\src\pages\Bills.jsx:492:        nextBills = bills.map((b) =>
E:\cashflow-app\src\pages\Bills.jsx:493:          b.id === editingBill.id
E:\cashflow-app\src\pages\Bills.jsx:499:                payer: billDraft.payer || b.payer,
E:\cashflow-app\src\pages\Bills.jsx:507:      await handleUpdateBills(nextBills);
E:\cashflow-app\src\pages\Bills.jsx:516:      showToast({ type: "success", message: "Bill saved." });
E:\cashflow-app\src\pages\Bills.jsx:518:      console.error("Failed to save bill", err);
E:\cashflow-app\src\pages\Bills.jsx:519:      showToast({ type: "error", message: "Failed to save bill. Please try again." });
E:\cashflow-app\src\pages\Bills.jsx:525:  const isEmpty = billsArr.length === 0;
E:\cashflow-app\src\pages\Bills.jsx:546:    () => makeScopedKey("billsSelectedMonth", { householdId }),
E:\cashflow-app\src\pages\Bills.jsx:587:    return (bills || [])
E:\cashflow-app\src\pages\Bills.jsx:605:  }, [bills, paidFlags, startDate, selectedMonth]);
E:\cashflow-app\src\pages\Bills.jsx:620:    return baseItems.filter((it) => isBillVisibleInSelfScope({ bill: it, role }));
E:\cashflow-app\src\pages\Bills.jsx:635:      getScopedBillAmount({ bill: it, role, billSharing });
E:\cashflow-app\src\pages\Bills.jsx:645:  }, [ownerFiltered, role, billSharing]);
E:\cashflow-app\src\pages\Bills.jsx:655:      billId: item.id,
E:\cashflow-app\src\pages\Bills.jsx:664:    handleBulkMark({ billIds: ids, monthIndex: selectedMonth, value });
E:\cashflow-app\src\pages\Bills.jsx:667:  const handleDelete = (bill) => {
E:\cashflow-app\src\pages\Bills.jsx:669:    setPendingDelete(bill);
E:\cashflow-app\src\pages\Bills.jsx:674:    const billId = pendingDelete.id;
E:\cashflow-app\src\pages\Bills.jsx:675:    setIsDeletingId(billId);
E:\cashflow-app\src\pages\Bills.jsx:676:    const prevBills = bills;
E:\cashflow-app\src\pages\Bills.jsx:677:    const nextBills = bills.filter((b) => b.id !== billId);
E:\cashflow-app\src\pages\Bills.jsx:680:      await Promise.resolve(handleUpdateBills(nextBills));
E:\cashflow-app\src\pages\Bills.jsx:681:      if (editingBill && editingBill.id === billId) {
E:\cashflow-app\src\pages\Bills.jsx:684:      showToast({ type: "success", message: "Bill deleted." });
E:\cashflow-app\src\pages\Bills.jsx:686:      console.error("Failed to delete bill", err);
E:\cashflow-app\src\pages\Bills.jsx:687:      handleUpdateBills(prevBills);
E:\cashflow-app\src\pages\Bills.jsx:688:      showToast({ type: "error", message: "Failed to delete bill. Please try again." });
E:\cashflow-app\src\pages\Bills.jsx:705:      data-testid="bills-page"
E:\cashflow-app\src\pages\Bills.jsx:707:      <header className="pt-4 space-y-4" data-testid="bills-header">
E:\cashflow-app\src\pages\Bills.jsx:715:                Bills
E:\cashflow-app\src\pages\Bills.jsx:729:              aria-label="Add bill"
E:\cashflow-app\src\pages\Bills.jsx:731:              Add Bill
E:\cashflow-app\src\pages\Bills.jsx:745:              placeholder="Search bills..."
E:\cashflow-app\src\pages\Bills.jsx:766:          data-testid="bills-empty"
E:\cashflow-app\src\pages\Bills.jsx:770:              You haven't added any bills yet.
E:\cashflow-app\src\pages\Bills.jsx:773:              Add your first bill to start planning your cash flow.
E:\cashflow-app\src\pages\Bills.jsx:783:                Add your first bill
E:\cashflow-app\src\pages\Bills.jsx:820:            billSharing={billSharing}
E:\cashflow-app\src\pages\Bills.jsx:823:          <div className="mt-4 space-y-3 px-0" data-testid="bills-list">
E:\cashflow-app\src\pages\Bills.jsx:830:                  No bills match this filter for the selected month.
E:\cashflow-app\src\pages\Bills.jsx:836:              const scopedAmount = getScopedBillAmount({
E:\cashflow-app\src\pages\Bills.jsx:837:                bill: item,
E:\cashflow-app\src\pages\Bills.jsx:839:                billSharing,
E:\cashflow-app\src\pages\Bills.jsx:848:              const catLabel = categoryLabelForBill(item);
E:\cashflow-app\src\pages\Bills.jsx:922:                          {handleUpdateBills && (
E:\cashflow-app\src\pages\Bills.jsx:938:                          {hasAccounts && handleChangeBillAccount ? (
E:\cashflow-app\src\pages\Bills.jsx:943:                                handleChangeBillAccount(item.id, e.target.value)
E:\cashflow-app\src\pages\Bills.jsx:982:      <BillFormSheet
E:\cashflow-app\src\pages\Bills.jsx:984:        bill={editingBill}
E:\cashflow-app\src\pages\Bills.jsx:992:        onSave={handleSaveBill}
E:\cashflow-app\src\pages\Bills.jsx:998:        title={`Delete bill "${pendingDelete?.name || "this bill"}"?`}
E:\cashflow-app\src\pages\Bills.jsx:999:        message="Delete this bill from all future months?"
E:\cashflow-app\src\pages\Home.jsx:17:  getScopedBillAmount,
E:\cashflow-app\src\pages\Home.jsx:18:  isBillVisibleInSelfScope,
E:\cashflow-app\src\pages\Home.jsx:19:} from "../lib/billSharing";
E:\cashflow-app\src\pages\Home.jsx:41:// Pure helper to compute "My Bills Due" given inputs and an optional clock.
E:\cashflow-app\src\pages\Home.jsx:42:export function computeBillsDueAmount({ bills = [], role = "H", billSharing, paidBills = {}, now = new Date() }) {
E:\cashflow-app\src\pages\Home.jsx:43:  const unpaidThisMonth = (bills || []).filter((b) => {
E:\cashflow-app\src\pages\Home.jsx:45:    const billId = b.id || "";
E:\cashflow-app\src\pages\Home.jsx:46:    if (!billId) return true;
E:\cashflow-app\src\pages\Home.jsx:47:    const key = `${dueDate}:${billId}`;
E:\cashflow-app\src\pages\Home.jsx:48:    const isPaid = !!paidBills?.[key];
E:\cashflow-app\src\pages\Home.jsx:49:    const visible = isBillVisibleInSelfScope({ bill: b, role });
E:\cashflow-app\src\pages\Home.jsx:53:  return unpaidThisMonth.reduce((total, bill) => {
E:\cashflow-app\src\pages\Home.jsx:54:    const share = getScopedBillAmount({ bill, role, billSharing });
E:\cashflow-app\src\pages\Home.jsx:73:  onGoToBills,
E:\cashflow-app\src\pages\Home.jsx:81:  const bills = useCashflowStore((state) => state.bills || []);
E:\cashflow-app\src\pages\Home.jsx:82:  const billSharing = useCashflowStore((state) => state.billSharing);
E:\cashflow-app\src\pages\Home.jsx:83:  const paidBills = useCashflowStore((state) => state.paidBills || {});
E:\cashflow-app\src\pages\Home.jsx:149:  // 3. Calculate "My Bills Due"
E:\cashflow-app\src\pages\Home.jsx:150:  const billsDueAmount = useMemo(
E:\cashflow-app\src\pages\Home.jsx:152:      computeBillsDueAmount({
E:\cashflow-app\src\pages\Home.jsx:153:        bills,
E:\cashflow-app\src\pages\Home.jsx:155:        billSharing,
E:\cashflow-app\src\pages\Home.jsx:156:        paidBills,
E:\cashflow-app\src\pages\Home.jsx:159:    [bills, role, billSharing, paidBills]
E:\cashflow-app\src\pages\Home.jsx:216:              <span className="text-caption font-medium">My Bills Due</span>
E:\cashflow-app\src\pages\Home.jsx:219:              {formatMoney(billsDueAmount)}
E:\cashflow-app\src\pages\Home.jsx:250:            onClick={onGoToBills}
E:\cashflow-app\src\pages\Home.jsx:253:            Pay Bills
E:\cashflow-app\src\pages\Home.jsx:295:                Not enough data to show cash flow yet. Add accounts, income, and bills
E:\cashflow-app\src\pages\Planner.jsx:25:  getScopedBillAmount,
E:\cashflow-app\src\pages\Planner.jsx:26:  isBillVisibleInSelfScope,
E:\cashflow-app\src\pages\Planner.jsx:27:} from "../lib/billSharing";
E:\cashflow-app\src\pages\Planner.jsx:36:  const billSharing = useCashflowStore((state) => state.billSharing);
E:\cashflow-app\src\pages\Planner.jsx:57:  // 1. Calculate Scoped Projection (My Bills Only)
E:\cashflow-app\src\pages\Planner.jsx:59:    if (!infographicProps || !infographicProps.liveBills) {
E:\cashflow-app\src\pages\Planner.jsx:66:      liveBills = [],
E:\cashflow-app\src\pages\Planner.jsx:82:    // B. Filter Bills (My Share Only)
E:\cashflow-app\src\pages\Planner.jsx:83:    const myBills = [];
E:\cashflow-app\src\pages\Planner.jsx:85:    liveBills.forEach((b, idx) => {
E:\cashflow-app\src\pages\Planner.jsx:86:      if (!isBillVisibleInSelfScope({ bill: b, role })) return;
E:\cashflow-app\src\pages\Planner.jsx:88:      const scopedAmount = getScopedBillAmount({
E:\cashflow-app\src\pages\Planner.jsx:89:        bill: b,
E:\cashflow-app\src\pages\Planner.jsx:91:        billSharing,
E:\cashflow-app\src\pages\Planner.jsx:94:      myBills.push({
E:\cashflow-app\src\pages\Planner.jsx:117:        bills: myBills,
E:\cashflow-app\src\pages\Planner.jsx:128:        paidBills: infographicProps.paidBills || {},
E:\cashflow-app\src\pages\Planner.jsx:140:  }, [initialCashflow, infographicProps, role, billSharing, projectionMonths]);
E:\cashflow-app\src\pages\Planner.jsx:230:              Net worth forecast based on recurring bills &amp; income
E:\cashflow-app\src\pages\Planner.jsx:233:                Actual = realized income/expenses up to today; future bills still included.
E:\cashflow-app\src\pages\Settings.jsx:16:import BillSharingForm from "../components/settings/BillSharingForm";
E:\cashflow-app\src\pages\Settings.jsx:46:  const bills = useCashflowStore((state) => state.bills || []);
E:\cashflow-app\src\pages\Settings.jsx:54:  const billSharing = useCashflowStore((state) => state.billSharing);
E:\cashflow-app\src\pages\Settings.jsx:60:    handleUpdateBills,
E:\cashflow-app\src\pages\Settings.jsx:66:    handleUpdateBillSharing,
E:\cashflow-app\src\pages\Settings.jsx:159:    // Update the accounts store immediately so we can link bills to these IDs
E:\cashflow-app\src\pages\Settings.jsx:180:    // --- STEP 3: Process Expenses (Bills) ---
E:\cashflow-app\src\pages\Settings.jsx:186:      const newBills = importPreview.expenses.map(b => {
E:\cashflow-app\src\pages\Settings.jsx:218:          amount: b.totalAmount, // The full amount of the bill
E:\cashflow-app\src\pages\Settings.jsx:226:      handleUpdateBills(newBills);
E:\cashflow-app\src\pages\Settings.jsx:228:      // Only update global split percentage based on the "Shared" bills found
E:\cashflow-app\src\pages\Settings.jsx:234:        handleUpdateBillSharing({
E:\cashflow-app\src\pages\Settings.jsx:237:            sharedBillIds: []
E:\cashflow-app\src\pages\Settings.jsx:340:  const handleBulkImport = ({ accounts: importedAccounts, bills: importedBills }) => {
E:\cashflow-app\src\pages\Settings.jsx:342:    const existingBills = bills || [];
E:\cashflow-app\src\pages\Settings.jsx:351:    const newBills = (importedBills || []).map((b) => ({
E:\cashflow-app\src\pages\Settings.jsx:364:    const allBills = [...existingBills, ...newBills];
E:\cashflow-app\src\pages\Settings.jsx:367:    handleUpdateBills(allBills);
E:\cashflow-app\src\pages\Settings.jsx:577:  const committedBillSharingRef = useRef(billSharing);
E:\cashflow-app\src\pages\Settings.jsx:578:  const [localBillSharing, setLocalBillSharing] = useState(
E:\cashflow-app\src\pages\Settings.jsx:579:    billSharing || { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] }
E:\cashflow-app\src\pages\Settings.jsx:581:  const [dirtyBillSharing, setDirtyBillSharing] = useState(false);
E:\cashflow-app\src\pages\Settings.jsx:584:    committedBillSharingRef.current = billSharing;
E:\cashflow-app\src\pages\Settings.jsx:585:    setLocalBillSharing(
E:\cashflow-app\src\pages\Settings.jsx:586:      billSharing || { mode: "manual", percentageSplit: { H: 0.5, W: 0.5 }, sharedBillIds: [] }
E:\cashflow-app\src\pages\Settings.jsx:588:    setDirtyBillSharing(false);
E:\cashflow-app\src\pages\Settings.jsx:589:  }, [billSharing]);
E:\cashflow-app\src\pages\Settings.jsx:591:  const handleBillSharingModeChange = (mode) => {
E:\cashflow-app\src\pages\Settings.jsx:592:    setLocalBillSharing((prev) => ({ ...prev, mode }));
E:\cashflow-app\src\pages\Settings.jsx:593:    setDirtyBillSharing(true);
E:\cashflow-app\src\pages\Settings.jsx:596:  const handleBillSharingPercentageChange = (who, value) => {
E:\cashflow-app\src\pages\Settings.jsx:600:    setLocalBillSharing((prev) => ({ ...prev, percentageSplit: { H: hShare / 100, W: wShare / 100 } }));
E:\cashflow-app\src\pages\Settings.jsx:601:    setDirtyBillSharing(true);
E:\cashflow-app\src\pages\Settings.jsx:604:  const handleSaveBillSharing = () => {
E:\cashflow-app\src\pages\Settings.jsx:606:      ...localBillSharing,
E:\cashflow-app\src\pages\Settings.jsx:607:      sharedBillIds: localBillSharing.sharedBillIds || [],
E:\cashflow-app\src\pages\Settings.jsx:609:    handleUpdateBillSharing(next);
E:\cashflow-app\src\pages\Settings.jsx:610:    setDirtyBillSharing(false);
E:\cashflow-app\src\pages\Settings.jsx:625:      "bill-sharing": "bill-sharing",
E:\cashflow-app\src\pages\Settings.jsx:645:        dirtyBillSharing;
E:\cashflow-app\src\pages\Settings.jsx:656:    dirtyBillSharing,
E:\cashflow-app\src\pages\Settings.jsx:725:              {/* Bills Preview - FIXED VISIBILITY */}
E:\cashflow-app\src\pages\Settings.jsx:730:                    {importPreview.expenses.map((bill, i) => {
E:\cashflow-app\src\pages\Settings.jsx:732:                       if (bill.split) {
E:\cashflow-app\src\pages\Settings.jsx:733:                          const h = bill.split["User A"] || 0;
E:\cashflow-app\src\pages\Settings.jsx:734:                          const w = bill.split["User B"] || 0;
E:\cashflow-app\src\pages\Settings.jsx:743:                                <p className="text-body font-medium text-surface-900">{bill.name}</p>
E:\cashflow-app\src\pages\Settings.jsx:745:                                    <span className="text-[10px] bg-surface-200 px-1.5 rounded text-surface-600 border border-surface-300">Due: {bill.dueDay}th</span>
E:\cashflow-app\src\pages\Settings.jsx:746:                                    <span className="text-[10px] bg-surface-200 px-1.5 rounded text-surface-600 border border-surface-300">{bill.category}</span>
E:\cashflow-app\src\pages\Settings.jsx:750:                                <p className="text-body font-semibold text-surface-900">{formatMoney(bill.totalAmount)}</p>
E:\cashflow-app\src\pages\Settings.jsx:768:                  This will configure your Income, Pay Schedule, and Bill Splits automatically.
E:\cashflow-app\src\pages\Settings.jsx:855:            { key: "bill-sharing", label: "Bill Sharing" },
E:\cashflow-app\src\pages\Settings.jsx:973:        {activeSection === "bill-sharing" && (
E:\cashflow-app\src\pages\Settings.jsx:977:                Bill Sharing
E:\cashflow-app\src\pages\Settings.jsx:979:              <BillSharingForm
E:\cashflow-app\src\pages\Settings.jsx:980:                billSharing={localBillSharing}
E:\cashflow-app\src\pages\Settings.jsx:981:                dirtyBillSharing={dirtyBillSharing}
E:\cashflow-app\src\pages\Settings.jsx:982:                onModeChange={handleBillSharingModeChange}
E:\cashflow-app\src\pages\Settings.jsx:983:                onPercentageChange={handleBillSharingPercentageChange}
E:\cashflow-app\src\pages\Settings.jsx:984:                onSave={handleSaveBillSharing}
