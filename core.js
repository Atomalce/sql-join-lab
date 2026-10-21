/**
 * 《SQL 连接实验室》核心模块（ES module）
 *
 * 说明：本模块只模拟指定 JOIN 模式下的“行级结果”，用于教学演示，
 * 它不是一个完整的 SQL 引擎，不解析 SQL、不处理任意表达式或排序。
 *
 * 数据约定：
 *   users  = [{ id, name }]
 *   orders = [{ id, userId, status }]，status 可为 'paid' / 'unpaid' / null
 *   真实 order.id 非空。
 *
 * 输出行：{ userId, name, orderId, status, padded }
 *   - 真实命中：orderId/status 取自订单，padded = false
 *   - 补齐行  ：orderId/status 为 null（数据库 NULL），padded = true
 *
 * 原则：
 *   - 按 users 输入顺序、其次按 orders 输入顺序输出
 *   - 保留重复匹配（一个用户多个订单 = 多行）
 *   - 孤立订单（找不到 userId 对应的用户）被忽略
 *   - 不修改输入的 users / orders 数组，输出行对象全部新建
 */

const PAID = 'paid';

/**
 * 连接键匹配。数据库里 NULL 不参与相等比较（NULL = NULL 结果为 UNKNOWN），
 * 因此仅当两侧都非空且相等时才算匹配，避免把 null 误当成回相等的键。
 */
function linkMatches(user, order) {
  if (user.id === null || user.id === undefined) return false;
  if (order.userId === null || order.userId === undefined) return false;
  return order.userId === user.id;
}

/**
 * 是否已支付。只在严格等于 'paid' 时为真；
 * null 与 'unpaid' 都不算，也不会把数据库 NULL 当成字符串 'paid'。
 */
function isPaid(order) {
  return order.status === PAID;
}

/** 该用户按订单输入顺序排列的匹配订单（filter 生成新数组，不动原数组）。 */
function matchedOrders(user, orders) {
  return orders.filter((order) => linkMatches(user, order));
}

/** 真实命中行。 */
function hitRow(user, order) {
  return {
    userId: user.id,
    name: user.name,
    orderId: order.id,
    status: order.status,
    padded: false,
  };
}

/** 未命中的补齐行（数据库 NULL 用 JS null 表示）。 */
function paddedRow(user) {
  return {
    userId: user.id,
    name: user.name,
    orderId: null,
    status: null,
    padded: true,
  };
}

/** all：LEFT JOIN，仅以 id 匹配。保留全部匹配，无匹配则补一行。 */
function joinAll(users, orders) {
  const rows = [];
  for (const user of users) {
    const matched = matchedOrders(user, orders);
    if (matched.length === 0) {
      rows.push(paddedRow(user));
      continue;
    }
    for (const order of matched) rows.push(hitRow(user, order));
  }
  return rows;
}

/**
 * on：LEFT JOIN，ON 中附加 status = 'paid'。
 * 未支付订单在 ON 阶段即视为“未匹配”，但 LEFT JOIN 仍保留用户，
 * 所以只有未支付订单（或没有订单）的用户会得到一行补齐行。
 */
function joinOnPaid(users, orders) {
  const rows = [];
  for (const user of users) {
    const paid = matchedOrders(user, orders).filter(isPaid);
    if (paid.length === 0) {
      rows.push(paddedRow(user));
      continue;
    }
    for (const order of paid) rows.push(hitRow(user, order));
  }
  return rows;
}

/**
 * where：先 LEFT JOIN（全部匹配都出现），再 WHERE status = 'paid'。
 *
 * 为什么“仅有未支付订单的用户”会消失：
 *   1) 该用户有真实匹配，LEFT JOIN 产生的是真实订单行（orderId 非空）；
 *   2) WHERE status = 'paid' 把这些未支付行筛掉；
 *   3) 如果该用户完全没有匹配订单，LEFT JOIN 会补一行 orderId/status 均为 NULL，
 *      而按 SQL 三值逻辑，NULL = 'paid' 结果是 UNKNOWN，不是 TRUE，同样被筛掉。
 *   于是无论哪种情况，该用户都没有任何行能通过 WHERE，整行（含补齐行）被丢弃，用户消失。
 */
function joinWherePaid(users, orders) {
  const rows = [];
  for (const user of users) {
    for (const order of matchedOrders(user, orders)) {
      if (isPaid(order)) rows.push(hitRow(user, order));
    }
  }
  return rows;
}

/**
 * orNull：先 LEFT JOIN，再 WHERE status = 'paid' OR o.id IS NULL。
 *
 * 为什么它依然会丢失“仅有未支付订单的用户”：
 *   o.id IS NULL 只能救回“完全没有匹配订单”的用户，因为只有这类用户
 *   才会被 LEFT JOIN 补出 orderId = NULL 的行。
 *   而“有订单但都未支付”的用户，其订单 id 是真实非空值，
 *   o.id IS NULL 为 FALSE，status = 'paid' 也为 FALSE，两个条件都不成立，
 *   该行被整体过滤 —— 用户既得不到真实行，也得不到补齐行，于是同样消失。
 */
function joinOrNull(users, orders) {
  const rows = [];
  for (const user of users) {
    const matched = matchedOrders(user, orders);
    const paid = matched.filter(isPaid);
    if (paid.length > 0) {
      for (const order of paid) rows.push(hitRow(user, order));
    } else if (matched.length === 0) {
      rows.push(paddedRow(user));
    }
    // 有匹配但都未支付：真实行被 status 条件过滤，且 orderId 非空使 o.id IS NULL 为假，用户不输出。
  }
  return rows;
}

/** inner：INNER JOIN 且 status = 'paid'，没有任何补齐行。 */
function joinInnerPaid(users, orders) {
  const rows = [];
  for (const user of users) {
    for (const order of matchedOrders(user, orders)) {
      if (isPaid(order)) rows.push(hitRow(user, order));
    }
  }
  return rows;
}

/**
 * 按模式执行 JOIN 模拟，返回结果行数组。不修改输入数组。
 * @param {{id:*,name:string}[]} users
 * @param {{id:*,userId:*,status:?string}[]} orders
 * @param {'all'|'on'|'where'|'orNull'|'inner'} mode
 */
export function runJoin(users, orders, mode) {
  switch (mode) {
    case 'all':
      return joinAll(users, orders);
    case 'on':
      return joinOnPaid(users, orders);
    case 'where':
      return joinWherePaid(users, orders);
    case 'orNull':
      return joinOrNull(users, orders);
    case 'inner':
      return joinInnerPaid(users, orders);
    default:
      throw new Error(`未知的 mode: ${mode}`);
  }
}

/**
 * 返回与各模式对应的可执行 SQL 文本。
 * 统一使用 users u / orders o，列别名 userId/name/orderId/status，ORDER BY u.id, o.id。
 * @param {'all'|'on'|'where'|'orNull'|'inner'} mode
 */
export function sqlFor(mode) {
  const cols = 'u.id AS userId, u.name AS name, o.id AS orderId, o.status AS status';
  switch (mode) {
    case 'all':
      return [
        `SELECT ${cols}`,
        'FROM users u',
        'LEFT JOIN orders o ON u.id = o.userId',
        'ORDER BY u.id, o.id',
      ].join('\n');
    case 'on':
      return [
        `SELECT ${cols}`,
        'FROM users u',
        "LEFT JOIN orders o ON u.id = o.userId AND o.status = 'paid'",
        'ORDER BY u.id, o.id',
      ].join('\n');
    case 'where':
      return [
        `SELECT ${cols}`,
        'FROM users u',
        'LEFT JOIN orders o ON u.id = o.userId',
        "WHERE o.status = 'paid'",
        'ORDER BY u.id, o.id',
      ].join('\n');
    case 'orNull':
      return [
        `SELECT ${cols}`,
        'FROM users u',
        'LEFT JOIN orders o ON u.id = o.userId',
        "WHERE o.status = 'paid' OR o.id IS NULL",
        'ORDER BY u.id, o.id',
      ].join('\n');
    case 'inner':
      return [
        `SELECT ${cols}`,
        'FROM users u',
        'INNER JOIN orders o ON u.id = o.userId',
        "WHERE o.status = 'paid'",
        'ORDER BY u.id, o.id',
      ].join('\n');
    default:
      throw new Error(`未知的 mode: ${mode}`);
  }
}

/**
 * 模拟 LEFT JOIN ... GROUP BY ... HAVING COUNT(o.id) > 0。
 * 这里只保留至少匹配一笔已支付订单的用户组，返回每组的订单数量。
 */
export function aggregatePaidUsers(users, orders) {
  const groups = [];
  for (const user of users) {
    const paidCount = matchedOrders(user, orders).filter(isPaid).length;
    if (paidCount > 0) groups.push({userId: user.id, name: user.name, paidCount});
  }
  return groups;
}
