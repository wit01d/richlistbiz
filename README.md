# Referral System Explained with Example

Let me walk you through with fresh users: **Anna, Bob, Carol, Dave, Eve, Frank**

---

## Step 1: Anna joins (first user, no referrer)

Anna registers directly without a referral link.

**Anna_listline:**

| Position 1 | Position 2 | Position 3 | Position 4 |

|------------|------------|------------|------------|

| SYSTEM | SYSTEM | SYSTEM | Anna |

💰 **Anna's $100 goes to → SYSTEM** (no upline exists)

---

## Step 2: Anna refers Bob

Bob uses richlist.biz/?ref=ANNA123

Bob's upline chain: Bob → Anna

**Bob_listline:**

| Position 1 | Position 2 | Position 3 | Position 4 |

|------------|------------|------------|------------|

| SYSTEM | SYSTEM | Anna | Bob |

💰 **Bob's $100 goes to → SYSTEM** (Position 1 is empty)

---

## Step 3: Bob refers Carol

Carol uses richlist.biz/?ref=BOB456

Carol's upline chain: Carol → Bob → Anna

**Carol_listline:**

| Position 1 | Position 2 | Position 3 | Position 4 |

|------------|------------|------------|------------|

| SYSTEM | Anna | Bob | Carol |

💰 **Carol's $100 goes to → SYSTEM** (Position 1 is empty)

---

## Step 4: Carol refers Dave

Dave uses richlist.biz/?ref=CAROL789

Dave's upline chain: Dave → Carol → Bob → Anna

**Dave_listline:**

| Position 1 | Position 2 | Position 3 | Position 4 |

|------------|------------|------------|------------|

| Anna | Bob | Carol | Dave |

💰 **Dave's $100 goes to → Anna** ✅ (First real payout!)

---

## Step 5: Dave refers Eve

Eve uses richlist.biz/?ref=DAVE111

Eve's upline chain: Eve → Dave → Carol → Bob

**Eve_listline:**

| Position 1 | Position 2 | Position 3 | Position 4 |

|------------|------------|------------|------------|

| Bob | Carol | Dave | Eve |

💰 **Eve's $100 goes to → Bob** ✅

---

## Step 6: Eve refers Frank

Frank uses richlist.biz/?ref=EVE222

Frank's upline chain: Frank → Eve → Dave → Carol

**Frank_listline:**

| Position 1 | Position 2 | Position 3 | Position 4 |

|------------|------------|------------|------------|

| Carol | Dave | Eve | Frank |

💰 **Frank's $100 goes to → Carol** ✅

---

## What if Bob also refers someone? (Parallel listline)

Bob directly refers **Grace** (not through his downline)

Grace uses richlist.biz/?ref=BOB456

Grace's upline chain: Grace → Bob → Anna

**Grace_listline:**

| Position 1 | Position 2 | Position 3 | Position 4 |

|------------|------------|------------|------------|

| SYSTEM | Anna | Bob | Grace |

💰 **Grace's $100 goes to → SYSTEM**

---

## And if Grace refers Henry?

Henry uses richlist.biz/?ref=GRACE333

Henry's upline chain: Henry → Grace → Bob → Anna

**Henry_listline:**

| Position 1 | Position 2 | Position 3 | Position 4 |

|------------|------------|------------|------------|

| Anna | Bob | Grace | Henry |

💰 **Henry's $100 goes to → Anna** ✅

---

## Summary: Who Earned What?

| User | Earnings | From |

|------|----------|------|

| **Anna** | $200 | Dave, Henry |

| **Bob** | $100 | Eve |

| **Carol** | $100 | Frank |

| **Dave** | $0 | - |

| **Eve** | $0 | - |

| **SYSTEM** | $400 | Anna, Bob, Carol, Grace |

---

## Visual Tree

```

                    ANNA (earned $200)

                   /    \

                BOB      GRACE

              (earned    │

               $100)     │

                │        HENRY → paid Anna

              CAROL

            (earned $100)

                │

              DAVE → paid Anna

                │

              EVE → paid Bob

                │

              FRANK → paid Carol

```

---

## Key Rules

1. **Each new user creates their own listline** based on their upline

2. **Position 1 always receives the payment**

3. **3 levels up** fill positions 1, 2, 3 (new user is always position 4)

4. **Empty positions = SYSTEM gets paid**

5. **Multiple referrals = Multiple independent listlines** (Bob's referrals don't affect Carol's listline)



# Successor System - Extended Example

Let me create a comprehensive example showing how the successor mechanism works.

---

## Original System Recap

**Dave's Listline (from the original example):**

```

Position 1    Position 2    Position 3    Position 4

   Anna          Bob          Carol         Dave

```

💰 Dave's €100 → Anna (Position 1)

---

## New Successor Mechanism

### Trigger Requirements for User4 (Dave):

1. ✅ Recruit **10 users** who made deposits = €1,000 revenue

2. ✅ Recruit **3 additional users** who also made deposits

3. ✅ **Nominate 1 successor** from those 3 additional users

**Total: 13 depositing recruits required**

---

## Example: Dave Achieves Successor Status

### Dave's 13 Recruits (all deposited €100):

```

Dave's Direct Recruits:

├── Eve      (1)  ✓ deposited

├── Frank    (2)  ✓ deposited

├── Grace    (3)  ✓ deposited

├── Henry    (4)  ✓ deposited

├── Iris     (5)  ✓ deposited

├── Jack     (6)  ✓ deposited

├── Kate     (7)  ✓ deposited

├── Leo      (8)  ✓ deposited

├── Mia      (9)  ✓ deposited

├── Noah    (10)  ✓ deposited  ← €1,000 revenue reached!

├── Olivia  (11)  ✓ deposited  ← Additional #1

├── Peter   (12)  ✓ deposited  ← Additional #2

└── Quinn   (13)  ✓ deposited  ← Additional #3 ★ NOMINATED AS SUCCESSOR

```

**Dave's Status:** €1,300 revenue generated → **QUALIFIES FOR SUCCESSOR**

---

## Successor Selection

Dave nominates **Quinn** as his successor from the 3 additional users (Olivia, Peter, Quinn).

### What Happens Now:

**A NEW LISTLINE is created:**

```

SUCCESSOR LISTLINE (Quinn replaces Dave in Position 4):

Position 1    Position 2    Position 3    Position 4

   Anna          Bob          Carol        QUINN ←(successor)

```

💰 Quinn's €100 → **Anna** (Position 1)

---

## Key Differences: Normal vs Successor

| Aspect | Normal Referral | Successor Assignment |

|--------|-----------------|---------------------|

| **Quinn's referrer** | Would be Dave | Becomes **Anna** |

| **Quinn's upline** | Quinn→Dave→Carol→Bob | Quinn→Anna |

| **Payment goes to** | Position 1 (Anna) | Position 1 (Anna) |

| **Benefits whose network?** | Dave's downline | **Anna's downline** |

| **Quinn's future recruits** | Build Dave's tree | Build **Anna's tree** |

---

## Visual: Before and After

### BEFORE (Normal System):

```

                    ANNA (Position 1)

                      │

                    BOB (Position 2)

                      │

                   CAROL (Position 3)

                      │

                    DAVE (Position 4) ──────┬─ recruits ─┬─ ... ─┬─ Quinn

                      │                     │            │        │

                    (Dave's downline)      Eve        Frank    (all 13)

```

### AFTER (Successor Activated):

```

                    ANNA (Position 1)

                   /    \

                BOB    QUINN ← GIFTED to Anna's downline!

                  │        │

               CAROL    (Quinn's future recruits

                  │      benefit ANNA, not Dave)

                DAVE

                  │

            (Dave's remaining 12 recruits)

```

---

## Complete Flow Example

### Step 1: Dave's Original Listline

```

Position 1    Position 2    Position 3    Position 4

   Anna          Bob          Carol         Dave

```

💰 Dave paid €100 → Anna

### Step 2: Dave Recruits 13 People (Building Toward Successor)

Each of Dave's recruits creates their own listline:

**Eve's Listline (Dave's 1st recruit):**

```

Position 1    Position 2    Position 3    Position 4

   Bob          Carol         Dave          Eve

```

💰 Eve's €100 → Bob

**Frank's Listline (Dave's 2nd recruit):**

```

Position 1    Position 2    Position 3    Position 4

   Bob          Carol         Dave         Frank

```

💰 Frank's €100 → Bob

... and so on for all 13 recruits.

### Step 3: Dave Reaches €1,000 + Nominates Successor

After recruit #13 (Quinn), Dave nominates Quinn as successor.

**Quinn's SUCCESSOR Listline (replaces Dave):**

```

Position 1    Position 2    Position 3    Position 4

   Anna          Bob          Carol        QUINN

```

💰 Quinn's €100 → Anna ✅

**Quinn is now in Anna's downline, NOT Dave's!**

---

## Revenue Summary After Successor

| User | Earnings | Source |

|------|----------|--------|

| **Anna** | €200 | Dave (original) + Quinn (successor) |

| **Bob** | €1,300 | Eve, Frank, Grace, Henry, Iris, Jack, Kate, Leo, Mia, Noah, Olivia, Peter, Quinn |

| Carol | €0 | (needs recruits 3 levels down) |

| Dave | €0 | (his recruits paid Bob, his successor went to Anna) |

---

## The Successor Chain Continues

Now **Quinn** is in Position 4 of Anna's listline.

If Quinn also recruits 13 depositing users and nominates a successor:

**Quinn's Successor Listline:**

```

Position 1    Position 2    Position 3    Position 4

   Anna          Bob          Carol      [Quinn's Successor]

```

💰 Quinn's successor also pays → **Anna**

**Anna keeps receiving successors as long as people in her Position 4 qualify!**

---

## Summary of Successor Rules

1. **Trigger**: Position 4 user generates €1,000 (10 depositing recruits) + 3 more depositing recruits

2. **Selection**: Position 4 nominates 1 of the 3 additional users as successor

3. **Placement**: Successor takes Position 4 on a **new listline** with same Positions 1-3

4. **Payment**: Successor pays €100 to Position 1

5. **Reassignment**: Successor belongs to Position 1's downline (NOT the nominator's)

6. **Benefit**: Position 1 receives both the payment AND grows their network



## Referral-System Formel

### Listline-Bildung

Für einen neuen Benutzer $U_{neu}$ mit Upline-Kette $U_{neu} \rightarrow R_1 \rightarrow R_2 \rightarrow R_3 \rightarrow ...$

$$
\text{Listline}(U_{neu}) = \begin{bmatrix} P_1 \\ P_2 \\ P_3 \\ P_4 \end{bmatrix} = \begin{bmatrix} R_3 \text{ (oder SYSTEM)} \\ R_2 \text{ (oder SYSTEM)} \\ R_1 \\ U_{neu} \end{bmatrix}
$$

### Zahlungsregel

$$
\text{Empfänger}(U_{neu}) = \begin{cases} R_3 & \text{wenn } \exists R_3 \\ \text{SYSTEM} & \text{sonst} \end{cases}
$$

### Successor-Trigger

Benutzer $U$ in Position 4 qualifiziert sich, wenn:

$$
\text{Qualifikation}(U) = \begin{cases} \text{true} & \text{wenn } |\{D_i : D_i \in \text{Recruits}(U) \land \text{deposited}(D_i)\}| \geq 13 \\ \text{false} & \text{sonst} \end{cases}
$$

### Successor-Platzierung

Wenn $U_{P4}$ den Successor $S$ nominiert:

$$
\text{Listline}_{successor}(S) = \begin{bmatrix} P_1 \\ P_2 \\ P_3 \\ S \end{bmatrix} \quad \text{wobei } \text{Referrer}(S) := P_1
$$

### Kompakte Gesamtformel

$$
\boxed{\text{Zahlung}(U) = $10 \rightarrow \text{Upline}^{(3)}(U) \quad | \quad \text{Successor nach } 13 \text{ Recruits} \rightarrow \text{Listline}_{original}[P_1]}
$$
