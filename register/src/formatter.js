import { sprintf } from 'sprintf-js';
import { QueryExpression, SqlFormatter } from '@themost/query';

function instanceOf(any, ctor) {
    // validate constructor
    if (typeof ctor !== 'function') {
        return false
    }
    // validate with instanceof
    if (any instanceof ctor) {
        return true;
    }
    return !!(any && any.constructor && any.constructor.name === ctor.name);
}


function isComparisonOrLogical(expr) {
    const key = Object.key(expr);
    return (/^\$(or|and|eq|ne|lt|lte|gt|gte|in|nin|text|regex)$/g.test(key));
}

/**
 * @this {SqlFormatter}
 * @param {*} ifExpr 
 * @param {*} thenExpr 
 * @param {*} elseExpr 
 * @returns 
 */
function $cond(ifExpr, thenExpr, elseExpr) {
    // validate ifExpr which should an instance of QueryExpression or a comparison expression
    let ifExpression;
    if (instanceOf(ifExpr, QueryExpression)) {
        ifExpression = this.formatWhere(ifExpr.$where);
    } else if (isComparisonOrLogical(ifExpr)) {
        ifExpression = this.formatWhere(ifExpr);
    } else {
        throw new Error('Condition parameter should be an instance of query or comparison expression');
    }
    return sprintf('(CASE %s WHEN 1 THEN %s ELSE %s END)', ifExpression, this.escape(thenExpr), this.escape(elseExpr));
}

/**
 * @this {SqlFormatter}
 * @param {*} expr 
 * @returns 
 */
function $switch(expr) {
    const branches = expr.branches;
    const defaultValue = expr.default;
    if (Array.isArray(branches) === false) {
        throw new Error('Switch branches must be an array');
    }
    if (branches.length === 0) {
        throw new Error('Switch branches cannot be empty');
    }
    let str = '(CASE';
    str += ' ';
    str += branches.map((branch) => {
        let caseExpression;
        if (instanceOf(branch.case, QueryExpression)) {
            caseExpression = this.formatWhere(branch.case.$where);
        } else if (this.isComparison(branch.case) || this.isLogical(branch.case)) {
            caseExpression = this.formatWhere(branch.case);
        } else {
            throw new Error('Case expression should be an instance of query or comparison expression');
        }
        return sprintf('WHEN %s THEN %s', caseExpression, this.escape(branch.then));
    }).join(' ');
    if (typeof defaultValue !== 'undefined') {
        str += ' ELSE ';
        str += this.escape(defaultValue);
    }
    str += ' END)';
    return str;
}

if (typeof SqlFormatter.prototype.$cond === 'undefined') {
    Object.assign(SqlFormatter.prototype, {
        $cond,
        $switch
    })
}
