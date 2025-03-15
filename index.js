const puppeteer = require('puppeteer');
const fs = require('fs');
const chalk = require('chalk');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get user input with promise
function question(query) {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
}

// Function to read token from file
function readToken() {
    try {
        return fs.readFileSync('token.txt', 'utf8').trim();
    } catch (error) {
        console.log(chalk.red('Error reading token file:'), error);
        process.exit(1);
    }
}

// Function to make API requests using Puppeteer
async function makeRequest(url, method, headers = {}, data = {}) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setRequestInterception(true);

        page.on('request', (req) => {
            req.continue({
                method: method,
                headers: headers,
                postData: method === 'POST' ? JSON.stringify(data) : undefined
            });
        });

        await page.goto(url, { waitUntil: 'networkidle2' });
        const response = await page.evaluate(() => document.body.innerText);
        return response;
    } catch (error) {
        console.log(chalk.red(`Error making ${method} request to ${url}:`), error);
        return JSON.stringify({ success: false, message: error.message });
    } finally {
        if (browser) await browser.close();
    }
}

// Function to introduce delay with interactive countdown
async function delay(ms) {
    const startTime = Date.now();
    const endTime = startTime + ms;
    const interval = 1000; // Update every second
    
    // Create the initial progress bar
    console.log('');
    process.stdout.write(chalk.cyan('⏳ Waiting: [') + '▒'.repeat(30) + '] ' + chalk.cyan(`${Math.ceil(ms/1000)}s remaining`) + '\r');
    
    while (Date.now() < endTime) {
        await new Promise(resolve => setTimeout(resolve, interval));
        const remaining = endTime - Date.now();
        const progress = 1 - (remaining / ms);
        const progressBarLength = Math.floor(progress * 30);
        const progressBar = '█'.repeat(progressBarLength) + '▒'.repeat(30 - progressBarLength);
        
        process.stdout.write(chalk.cyan('⏳ Waiting: [') + chalk.green(progressBar) + '] ' + 
                           chalk.cyan(`${Math.ceil(remaining/1000)}s remaining`) + '\r');
    }
    
    process.stdout.write(chalk.cyan('⏳ Waiting: [') + chalk.green('█'.repeat(30)) + '] ' + 
                       chalk.cyan('Complete!       ') + '\n\n');
}

// Function to print box
function printBox(title, content, color = 'blue') {
    const colorFn = chalk[color];
    const width = 70;
    const lines = [];
    
    // Split content into lines if it's an array
    if (Array.isArray(content)) {
        lines.push(...content);
    } else {
        lines.push(content);
    }
    
    // Top border
    console.log(colorFn('╔' + '═'.repeat(width - 2) + '╗'));
    
    // Title
    console.log(colorFn('║') + chalk.bold(` ${title}`.padEnd(width - 2)) + colorFn(' '));
    
    // Separator
    console.log(colorFn('╠' + '═'.repeat(width - 2) + '╣'));
    
    // Content lines
    for (const line of lines) {
        console.log(colorFn('║') + ` ${line}`.padEnd(width - 2) + colorFn(' '));
    }
    
    // Bottom border
    console.log(colorFn('╚' + '═'.repeat(width - 2) + '╝'));
}

// Function to format date in WIB timezone
function formatDateWIB(date) {
    // Convert to WIB timezone (GMT+7)
    const options = {
        timeZone: 'Asia/Jakarta',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    return date.toLocaleTimeString('id-ID', options);
}

// Get current time in WIB timezone
function getTimestampWIB() {
    const now = new Date();
    return chalk.gray(`[${formatDateWIB(now)}]`);
}

// Function to log with timestamp (WIB)
function logWithTime(message, type = 'info') {
    let colorFn;
    let prefix;
    
    switch (type) {
        case 'success':
            colorFn = chalk.green;
            prefix = '✅ ';
            break;
        case 'error':
            colorFn = chalk.red;
            prefix = '❌ ';
            break;
        case 'warning':
            colorFn = chalk.yellow;
            prefix = '⚠️ ';
            break;
        case 'info':
        default:
            colorFn = chalk.blue;
            prefix = 'ℹ️ ';
    }
    
    console.log(`${getTimestampWIB()} ${colorFn(prefix + message)}`);
}

// Function to fetch wallet information
async function fetchWalletInfo(headers) {
    const walletsUrl = 'https://api.testnet.liqfinity.com/v1/user/wallets';
    logWithTime('Fetching wallet information...', 'info');
    
    const walletsResponse = await makeRequest(walletsUrl, 'GET', headers);
    
    try {
        const walletsData = JSON.parse(walletsResponse);
        if (walletsData.success && walletsData.data && walletsData.data.wallets) {
            // Find USDT wallet
            const usdtWallet = walletsData.data.wallets.find(w => w.code === 'USDT');
            if (usdtWallet) {
                // Display wallet information in a nice box
                printBox('WALLET INFORMATION', [
                    `Asset: ${chalk.bold('USDT')}`,
                    `Balance: ${chalk.yellow(usdtWallet.balance.toLocaleString('en-US', { maximumFractionDigits: 2 }))} USDT`,
                    `Staked: ${chalk.yellow(usdtWallet.activeStakeBalance.toLocaleString('en-US', { maximumFractionDigits: 2 }))} USDT`,
                    `Total Revenue: ${chalk.yellow(usdtWallet.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 }))} USDT`
                ], 'cyan');
                return usdtWallet;
            } else {
                logWithTime('USDT wallet not found', 'warning');
                return null;
            }
        } else {
            logWithTime('Invalid wallets response format', 'error');
            console.log(walletsData);
            return null;
        }
    } catch (error) {
        logWithTime('Error parsing wallets response', 'error');
        console.log(error);
        return null;
    }
}

// Function to fetch points
async function fetchPoints(headers) {
    const pointsUrl = 'https://api.testnet.liqfinity.com/v1/user/points';
    logWithTime('Fetching points...', 'info');
    
    const pointsResponse = await makeRequest(pointsUrl, 'GET', headers);
    
    try {
        const pointsData = JSON.parse(pointsResponse);
        if (pointsData.success && pointsData.data && pointsData.data.points) {
            const points = pointsData.data.points;
            
            // Format numbers with commas
            const formattedBorrowPoints = Number(points.borrowPoints).toLocaleString('en-US', {maximumFractionDigits: 2});
            const formattedLiquidityPoints = Number(points.liquidityPoints).toLocaleString('en-US', {maximumFractionDigits: 2});
            const formattedReferralPoints = Number(points.referralPoints).toLocaleString('en-US', {maximumFractionDigits: 2});
            const formattedSumPoints = Number(points.sumPoints).toLocaleString('en-US', {maximumFractionDigits: 2});
            
            // Display points in a nice box
            printBox('REWARDS POINTS', [
                `Rank: ${chalk.yellow('#' + points.rank)}`,
                `Borrow Points: ${chalk.yellow(formattedBorrowPoints)}`,
                `Liquidity Points: ${chalk.yellow(formattedLiquidityPoints)}`,
                `Referral Points: ${chalk.yellow(formattedReferralPoints)}`,
                `Total Points: ${chalk.bold.yellow(formattedSumPoints)}`
            ], 'magenta');
            
            return points;
        } else {
            logWithTime('Invalid points response format', 'error');
            console.log(pointsData);
            return null;
        }
    } catch (error) {
        logWithTime('Error parsing points response', 'error');
        console.log(error);
        return null;
    }
}

// Function to validate lock amount
async function validateLock(headers, amount) {
    const validateUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/stake/validate';
    logWithTime(`Validating lock amount: ${amount.toLocaleString('en-US', {maximumFractionDigits: 2})} USDT...`, 'info');
    
    const validateData = { amount: parseFloat(amount) };
    const validateResponse = await makeRequest(validateUrl, 'POST', headers, validateData);
    
    try {
        const validateResult = JSON.parse(validateResponse);
        if (validateResult.success && validateResult.data && validateResult.data.stake) {
            const stake = validateResult.data.stake;
            
            printBox('LOCK VALIDATION', [
                `Amount: ${chalk.yellow(stake.amount.toLocaleString('en-US', {maximumFractionDigits: 8}))} USDT`,
                `Fee: ${chalk.yellow(stake.fee.toLocaleString('en-US', {maximumFractionDigits: 8}))} USDT`,
                `Status: ${chalk.green('VALID')}`
            ], 'green');
            
            return stake;
        } else {
            logWithTime('Lock validation failed', 'error');
            console.log(validateResult);
            return null;
        }
    } catch (error) {
        logWithTime('Error parsing lock validation response', 'error');
        console.log(error);
        return null;
    }
}

// Function to create lock
async function createLock(headers, amount, fee) {
    const lockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/stake/create';
    logWithTime(`Creating lock with amount: ${amount.toLocaleString('en-US', {maximumFractionDigits: 2})} USDT...`, 'info');
    
    const lockData = { amount: amount.toString(), fee: fee.toString() };
    const lockResponse = await makeRequest(lockUrl, 'POST', headers, lockData);
    
    try {
        const lockResult = JSON.parse(lockResponse);
        if (lockResult.success && lockResult.data && lockResult.data.stake) {
            const stake = lockResult.data.stake;
            
            // Calculate formatted amounts
            const amountFmt = parseFloat(stake.amount).toLocaleString('en-US', {maximumFractionDigits: 8});
            const preBalanceFmt = parseFloat(stake.preBalance).toLocaleString('en-US', {maximumFractionDigits: 2});
            const postBalanceFmt = parseFloat(stake.postBalance).toLocaleString('en-US', {maximumFractionDigits: 2});
            
            printBox('LOCK CREATED', [
                `Transaction ID: ${chalk.yellow(stake.id)}`,
                `Amount Locked: ${chalk.yellow(amountFmt)} USDT`,
                `Previous Balance: ${chalk.blue(preBalanceFmt)} USDT`,
                `Remaining Balance: ${chalk.blue(postBalanceFmt)} USDT`,
                `Status: ${chalk.green(stake.status)}`
            ], 'green');
            
            return stake;
        } else {
            logWithTime('Lock creation failed', 'error');
            console.log(lockResult);
            return null;
        }
    } catch (error) {
        logWithTime('Error parsing lock creation response', 'error');
        console.log(error);
        return null;
    }
}

// Function to validate unlock amount
async function validateUnlock(headers, amount) {
    const validateUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/liquidation/validate';
    logWithTime(`Validating unlock amount: ${amount.toLocaleString('en-US', {maximumFractionDigits: 2})} USDT...`, 'info');
    
    const validateData = { amount: parseFloat(amount) };
    const validateResponse = await makeRequest(validateUrl, 'POST', headers, validateData);
    
    try {
        const validateResult = JSON.parse(validateResponse);
        if (validateResult.success && validateResult.data && validateResult.data.liquidation) {
            const liquidation = validateResult.data.liquidation;
            
            printBox('UNLOCK VALIDATION', [
                `Amount: ${chalk.yellow(liquidation.amount.toLocaleString('en-US', {maximumFractionDigits: 8}))} USDT`,
                `Fee: ${chalk.yellow(liquidation.fee.toLocaleString('en-US', {maximumFractionDigits: 8}))} USDT`,
                `Status: ${chalk.green('VALID')}`
            ], 'green');
            
            return liquidation;
        } else {
            logWithTime('Unlock validation failed', 'error');
            console.log(validateResult);
            return null;
        }
    } catch (error) {
        logWithTime('Error parsing unlock validation response', 'error');
        console.log(error);
        return null;
    }
}

// Function to create unlock
async function createUnlock(headers, amount, fee) {
    const unlockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/liquidation/create';
    logWithTime(`Creating unlock with amount: ${amount.toLocaleString('en-US', {maximumFractionDigits: 2})} USDT...`, 'info');
    
    const unlockData = { amount: amount.toString(), fee: fee ? fee.toString() : "0.00057" };
    const unlockResponse = await makeRequest(unlockUrl, 'POST', headers, unlockData);
    
    try {
        const unlockResult = JSON.parse(unlockResponse);
        if (unlockResult.success && unlockResult.data && unlockResult.data.liquidation) {
            const liquidation = unlockResult.data.liquidation;
            
            printBox('UNLOCK CREATED', [
                `Amount Unlocked: ${chalk.yellow(liquidation.amount.toLocaleString('en-US', {maximumFractionDigits: 8}))} USDT`,
                `Status: ${chalk.green('COMPLETED')}`
            ], 'green');
            
            return liquidation;
        } else {
            logWithTime('Unlock creation failed', 'error');
            console.log(unlockResult);
            return null;
        }
    } catch (error) {
        logWithTime('Error parsing unlock creation response', 'error');
        console.log(error);
        return null;
    }
}

// Exact borrow validation with precise calculation and fallback to lower amounts
async function validateBorrowExact(headers, collateralCurrencyCode, collateralAmount) {
    logWithTime(`Using exact validation approach for ${collateralAmount} ${collateralCurrencyCode}...`, 'info');
    
    // Get current currency rate
    const currencyInfo = await getCurrentCurrencyRate(headers, collateralCurrencyCode);
    if (!currencyInfo) {
        logWithTime('Failed to get currency rate', 'error');
        return null;
    }
    
    // Calculate EXACT amount with NO safety factor
    const exactAmount = collateralAmount * currencyInfo.rate;
    logWithTime(`Current ${collateralCurrencyCode} rate: ${currencyInfo.rate} USDT`, 'info');
    logWithTime(`Calculated EXACT amount: ${exactAmount} USDT (100% of value)`, 'info');
    
    // Values to try in sequence
    const amountsToTry = [
        { label: 'exact value', amount: exactAmount },
        { label: '99.9% of market value', amount: exactAmount * 0.999 },
        { label: '99% of market value', amount: exactAmount * 0.99 },
        { label: '95% of market value', amount: exactAmount * 0.95 },
        { label: '90% of market value', amount: exactAmount * 0.90 }
    ];
    
    // For low-value collateral (like LTC), also try some fixed small amounts
    if (exactAmount > 20) {  // Only add these for larger collateral values
        amountsToTry.push({ label: 'fixed 15 USDT (for LTC)', amount: 15 });
    }
    
    // Try validation with each amount
    const validateUrl = 'https://api.testnet.liqfinity.com/v1/user/loans/validate-borrow';
    
    for (const option of amountsToTry) {
        logWithTime(`Validating borrow: ${collateralAmount} ${collateralCurrencyCode} for ${option.amount} USDT (${option.label})...`, 'info');
        
        const validateData = {
            collateralCurrencyCode,
            collateralAmount,
            principalAmount: option.amount,
            principalCurrencyCode: "USDT"
        };
        
        const validateResponse = await makeRequest(validateUrl, 'POST', headers, validateData);
        
        try {
            const validateResult = JSON.parse(validateResponse);
            if (validateResult.success && validateResult.data && validateResult.data.loan) {
                const loan = validateResult.data.loan;
                
                printBox('BORROW VALIDATION SUCCESSFUL', [
                    `Collateral: ${chalk.yellow(collateralAmount)} ${collateralCurrencyCode}`,
                    `Principal: ${chalk.yellow(loan.principalAmount)} USDT`,
                    `Rate: ${chalk.yellow(currencyInfo.rate)} USDT per ${collateralCurrencyCode}`,
                    `Used: ${chalk.yellow(option.label)}`,
                    `Activation Fee: ${chalk.yellow(loan.activationAmount)} USDT (${loan.activationFee}%)`,
                    `Status: ${chalk.green('VALID')}`
                ], 'green');
                
                return loan;
            } else {
                logWithTime(`Validation with ${option.label} failed: ${validateResult.message}`, 'warning');
                
                // Wait a bit before the next attempt
                await delay(2000);
            }
        } catch (error) {
            logWithTime('Error parsing validation response', 'error');
            console.log(error);
        }
    }
    
    logWithTime('All validation attempts failed', 'error');
    return null;
}

// Function to confirm borrow with exact values
async function confirmBorrowImproved(headers, collateralCurrencyCode, collateralAmount, principalAmount) {
    const borrowUrl = 'https://api.testnet.liqfinity.com/v1/user/loans/confirm-borrow';
    logWithTime(`Creating borrow with ${collateralAmount} ${collateralCurrencyCode} for ${principalAmount} USDT...`, 'info');
    
    // Important: Pass exact values without formatting
    const borrowData = {
        collateralCurrencyCode,
        collateralAmount,
        principalAmount,
        principalCurrencyCode: "USDT"
    };
    
    const borrowResponse = await makeRequest(borrowUrl, 'POST', headers, borrowData);
    
    try {
        const borrowResult = JSON.parse(borrowResponse);
        if (borrowResult.success && borrowResult.data && borrowResult.data.loan) {
            const loan = borrowResult.data.loan;
            
            printBox('BORROW CREATED', [
                `Loan ID: ${chalk.yellow(loan.id)}`,
                `Collateral: ${chalk.yellow(loan.collateralAmount)} ${loan.collateralCurrencyCode}`,
                `Principal: ${chalk.yellow(loan.principalAmount)} ${loan.principalCurrencyCode}`,
                `Repayment Amount: ${chalk.yellow(loan.repaymentAmount)} ${loan.principalCurrencyCode}`,
                `Status: ${chalk.green(loan.status)}`
            ], 'green');
            
            return loan;
        } else {
            logWithTime('Borrow creation failed', 'error');
            console.log(borrowResult);
            return null;
        }
    } catch (error) {
        logWithTime('Error parsing borrow creation response', 'error');
        console.log(error);
        return null;
    }
}

// Function to get current currency rate from API
async function getCurrentCurrencyRate(headers, currencyCode) {
    const url = `https://api.testnet.liqfinity.com/v1/user/loans/currencies/${currencyCode}`;
    logWithTime(`Getting current ${currencyCode} rate...`, 'info');
    
    const response = await makeRequest(url, 'GET', headers);
    
    try {
        const data = JSON.parse(response);
        if (data.success && data.data) {
            const rate = data.data.rate;
            logWithTime(`Current ${currencyCode} rate: ${rate} USDT`, 'info');
            return data.data;
        } else {
            logWithTime(`Failed to get ${currencyCode} rate`, 'error');
            console.log(data);
            return null;
        }
    } catch (error) {
        logWithTime(`Error parsing ${currencyCode} rate response`, 'error');
        console.log(error);
        return null;
    }
}

// Modified check for available collaterals
async function checkAvailableCollaterals(headers) {
    logWithTime('Checking available collaterals using alternative method...', 'info');
    
    // Try to get info for common collateral currencies
    const currencyCodes = ['LTC', 'BTC', 'ETH'];
    let bestCollateral = null;
    
    for (const code of currencyCodes) {
        const currencyInfo = await getCurrencyInfo(headers, code);
        
        if (currencyInfo && currencyInfo.collateralAvailable > 0) {
            const usdValue = currencyInfo.collateralAvailable * currencyInfo.rate;
            
            if (!bestCollateral || usdValue > bestCollateral.usdValue) {
                bestCollateral = {
                    ...currencyInfo,
                    usdValue
                };
            }
        }
    }
    
    if (bestCollateral) {
        printBox('COLLATERAL FOUND', [
            `Asset: ${chalk.yellow(bestCollateral.code)}`,
            `Available: ${chalk.yellow(bestCollateral.collateralAvailable.toLocaleString('en-US', {maximumFractionDigits: 8}))} ${bestCollateral.code}`,
            `USD Value: ${chalk.yellow(bestCollateral.usdValue.toLocaleString('en-US', {maximumFractionDigits: 2}))} USD`,
            `Rate: ${chalk.yellow(bestCollateral.rate.toLocaleString('en-US', {maximumFractionDigits: 2}))} USD`
        ], 'cyan');
        
        return bestCollateral;
    } else {
        logWithTime('No available collaterals found using alternative method', 'warning');
        return null;
    }
}

// Function to get a specific currency info for borrow validation
async function getCurrencyInfo(headers, currencyCode) {
    const url = `https://api.testnet.liqfinity.com/v1/user/loans/currencies/${currencyCode}`;
    logWithTime(`Getting currency info for ${currencyCode}...`, 'info');
    
    const response = await makeRequest(url, 'GET', headers);
    
    try {
        const data = JSON.parse(response);
        if (data.success && data.data) {
            return data.data;
        } else {
            logWithTime(`Failed to get currency info for ${currencyCode}`, 'error');
            console.log(data);
            return null;
        }
    } catch (error) {
        logWithTime(`Error parsing currency info response for ${currencyCode}`, 'error');
        console.log(error);
        return null;
    }
}

// Function to check available collaterals for borrowing
async function checkCollaterals(headers) {
    const url = 'https://api.testnet.liqfinity.com/v1/user/loans/currencies';
    logWithTime('Checking available collaterals for borrowing...', 'info');
    
    const response = await makeRequest(url, 'GET', headers);
    
    try {
        const data = JSON.parse(response);
        if (data.success && data.data) {
            // Handle different potential data structures
            let currencies = [];
            
            // Check if data.data is an array directly
            if (Array.isArray(data.data)) {
                currencies = data.data;
            } 
            // Check if data.data has a 'currencies' property
            else if (data.data.currencies && Array.isArray(data.data.currencies)) {
                currencies = data.data.currencies;
            }
            // Print out the actual structure to help debug
            else {
                logWithTime('Unexpected data structure for collaterals. Printing data structure:', 'warning');
                console.log(JSON.stringify(data.data, null, 2));
                return null;
            }
            
            // If we have currencies to check
            if (currencies.length > 0) {
                // Find the best collateral (one with highest available amount)
                let bestCollateral = null;
                
                for (const currency of currencies) {
                    if (currency.collateralAvailable > 0) {
                        if (!bestCollateral || currency.collateralAvailable * currency.rate > bestCollateral.collateralAvailable * bestCollateral.rate) {
                            bestCollateral = currency;
                        }
                    }
                }
                
                if (bestCollateral) {
                    const usdValue = bestCollateral.collateralAvailable * bestCollateral.rate;
                    printBox('COLLATERAL FOUND', [
                        `Asset: ${chalk.yellow(bestCollateral.code)}`,
                        `Available: ${chalk.yellow(bestCollateral.collateralAvailable.toLocaleString('en-US', {maximumFractionDigits: 8}))} ${bestCollateral.code}`,
                        `USD Value: ${chalk.yellow(usdValue.toLocaleString('en-US', {maximumFractionDigits: 2}))} USD`,
                        `Rate: ${chalk.yellow(bestCollateral.rate.toLocaleString('en-US', {maximumFractionDigits: 2}))} USD`
                    ], 'cyan');
                    
                    return bestCollateral;
                } else {
                    logWithTime('No available collaterals found for borrowing', 'warning');
                    return null;
                }
            } else {
                logWithTime('No currencies found in the response', 'warning');
                return null;
            }
        } else {
            // Print out what the actual response looks like
            logWithTime('Invalid collaterals response format', 'error');
            console.log(data);
            return null;
        }
    } catch (error) {
        logWithTime('Error parsing collaterals response', 'error');
        console.log(error);
        // Print the raw response to help debug
        console.log('Raw response:', response);
        return null;
    }
}

// Function to fetch active loans
async function fetchActiveLoans(headers) {
    const loansUrl = 'https://api.testnet.liqfinity.com/v1/user/loans?&order[createdAt]=DESC';
    logWithTime('Fetching active loans...', 'info');
    
    const loansResponse = await makeRequest(loansUrl, 'GET', headers);
    
    try {
        const loansData = JSON.parse(loansResponse);
        if (loansData.success && loansData.data && loansData.data.loans) {
            const activeLoans = loansData.data.loans.filter(loan => loan.status === 'ACTIVE');
            
            if (activeLoans.length > 0) {
                printBox('ACTIVE LOANS', [
                    `Total Active Loans: ${chalk.yellow(activeLoans.length)}`,
                    `Total Borrowed: ${chalk.yellow(activeLoans.reduce((sum, loan) => sum + loan.principalAmount, 0).toLocaleString('en-US', {maximumFractionDigits: 2}))} USDT`
                ], 'cyan');
                
                return activeLoans;
            } else {
                logWithTime('No active loans found', 'info');
                return [];
            }
        } else {
            logWithTime('Invalid loans response format', 'error');
            console.log(loansData);
            return [];
        }
    } catch (error) {
        logWithTime('Error parsing loans response', 'error');
        console.log(error);
        return [];
    }
}

// Function to repay loan
async function repayLoan(headers, loanId, amount) {
    const repayUrl = `https://api.testnet.liqfinity.com/v1/user/loans/${loanId}/repay`;
    logWithTime(`Repaying loan ${loanId} with amount ${amount.toLocaleString('en-US', {maximumFractionDigits: 2})} USDT...`, 'info');
    
    const repayData = {
        amount: amount
    };
    
    const repayResponse = await makeRequest(repayUrl, 'POST', headers, repayData);
    
    try {
        const repayResult = JSON.parse(repayResponse);
        if (repayResult.success && repayResult.data && repayResult.data.loan) {
            const loan = repayResult.data.loan;
            
            printBox('LOAN REPAID', [
                `Loan ID: ${chalk.yellow(loan.id)}`,
                `Amount Paid: ${chalk.yellow(loan.paidAmount.toLocaleString('en-US', {maximumFractionDigits: 2}))} USDT`,
                `Status: ${chalk.green(loan.status)}`
            ], 'green');
            
            return loan;
        } else {
            logWithTime('Loan repayment failed', 'error');
            console.log(repayResult);
            return null;
        }
    } catch (error) {
        logWithTime('Error parsing loan repayment response', 'error');
        console.log(error);
        return null;
    }
}

// Function to display ASCII art banner
function showBanner() {
    const banner = chalk.cyan(`
    ██╗     ██╗ ██████╗ ███████╗██╗███╗   ██╗██╗████████╗██╗   ██╗
    ██║     ██║██╔═══██╗██╔════╝██║████╗  ██║██║╚══██╔══╝╚██╗ ██╔╝
    ██║     ██║██║   ██║█████╗  ██║██╔██╗ ██║██║   ██║    ╚████╔╝ 
    ██║     ██║██║▄▄ ██║██╔══╝  ██║██║╚██╗██║██║   ██║     ╚██╔╝  
    ███████╗██║╚██████╔╝██║     ██║██║ ╚████║██║   ██║      ██║   
    ╚══════╝╚═╝ ╚══▀▀═╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝      ╚═╝   
    `);
    
    const subtitle = chalk.yellow('Auto Stake/Unstake Bot | ') + chalk.green('Liquidity Mining Tool');
    const credits = chalk.magenta('Created by: ') + chalk.bold.white('https://t.me/yoakeid');
    const warning = chalk.red('For personal use only. Not for resale or redistribution.');
    
    console.log(banner);
    console.log(' '.repeat(12) + subtitle);
    console.log(' '.repeat(20) + credits);
    console.log(' '.repeat(10) + warning);
    console.log('\n');
}

// Function to get public IP
async function getPublicIP() {
    return new Promise((resolve, reject) => {
        const https = require('https');
        
        // Try multiple services in case one fails
        const ipServices = [
            'https://api.ipify.org',
            'https://api.ip.sb/ip',
            'https://icanhazip.com'
        ];
        
        const service = ipServices[0]; // Start with the first service
        
        https.get(service, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve(data.trim());
            });
        }).on('error', (e) => {
            console.error(`Error getting IP from ${service}: ${e.message}`);
            // Could add fallback to other services here
            resolve('Unknown');
        });
    });
}

// Function to check if IP is whitelisted
async function checkIPWhitelist() {
    try {
        // Get current public IP
        logWithTime('Checking IP whitelist...', 'info');
        
        // Get the public IP
        const currentIP = await getPublicIP();
        
        // Get the whitelist from GitHub
        const https = require('https');
        const whitelistUrl = 'https://raw.githubusercontent.com/YoaTzy/ip-whitelist/refs/heads/main/allow';
        
        return new Promise((resolve) => {
            https.get(whitelistUrl, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        // Parse the whitelist data
                        const whitelistEntries = data.trim().split('\n');
                        const now = new Date();
                        let isWhitelisted = false;
                        let expiryDate = null;
                        
                        for (const entry of whitelistEntries) {
                            const [ip, expiry] = entry.trim().split(' ');
                            
                            if (ip === currentIP) {
                                // Convert expiry date (DD-MM-YYYY) to Date object
                                const [day, month, year] = expiry.split('-').map(Number);
                                expiryDate = new Date(year, month - 1, day); // month is 0-indexed
                                
                                if (now <= expiryDate) {
                                    isWhitelisted = true;
                                    break;
                                }
                            }
                        }
                        
                        if (isWhitelisted) {
                            printBox('LICENSE VALID', [
                                `IP: ${chalk.green(currentIP)}`,
                                `Expires: ${chalk.green(expiryDate.toLocaleDateString('id-ID'))}`,
                                `Status: ${chalk.green('WHITELISTED')}`
                            ], 'green');
                            resolve({ valid: true, permanent: true, ip: currentIP });
                        } else {
                            // Set trial period (1 hour)
                            // Calculate end time in WIB timezone
                            const trialEnd = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour in milliseconds
                            
                            const trialEndWIB = formatDateWIB(trialEnd);
                            
                            printBox('TRIAL MODE ACTIVE', [
                                `IP: ${chalk.yellow(currentIP)}`,
                                `Trial Ends: ${chalk.yellow(trialEndWIB)}`,
                                `Status: ${chalk.yellow('TRIAL - 1 HOUR (WIB)')}`
                            ], 'yellow');
                            
                            // Set a timeout to end the script after trial period
                            setTimeout(() => {
                                printBox('TRIAL EXPIRED', [
                                    `Trial period has ended. Contact ${chalk.cyan('https://t.me/yoakeid')} to purchase a license.`
                                ], 'red');
                                process.exit(0);
                            }, 60 * 60 * 1000); // 1 hour
                            
                            resolve({ valid: true, permanent: false, trialEnd, ip: currentIP });
                        }
                    } catch (error) {
                        logWithTime('Error processing whitelist: ' + error.message, 'error');
                        // Default to trial mode on error
                        resolve({ valid: true, permanent: false, ip: currentIP });
                    }
                });
            }).on('error', (error) => {
                logWithTime('Error fetching whitelist: ' + error.message, 'error');
                // Default to trial mode on error
                resolve({ valid: true, permanent: false, ip: 'Unknown' });
            });
        });
    } catch (error) {
        logWithTime('IP check error: ' + error.message, 'error');
        return { valid: true, permanent: false, ip: 'Unknown' };
    }
}

// Function to display main menu
async function showMainMenu() {
    console.log('\n');
    printBox('MAIN MENU', [
        `${chalk.cyan('[1]')} Lock & Unlock (Staking) STABLE`,
        `${chalk.cyan('[2]')} Borrow & Repay (Loans) - BETA `,
        `${chalk.cyan('[3]')} Both Lock/Unlock & Borrow/Repay - BETA`,
        `${chalk.cyan('[4]')} Display User Information Only`,
        `${chalk.cyan('[5]')} Exit`
    ], 'magenta');
    
    const choice = await question(chalk.yellow('Enter your choice (1-5): '));
    return choice.trim();
}

// Function to show lock/unlock options menu
async function showLockUnlockMenu() {
    console.log('\n');
    printBox('LOCK & UNLOCK OPTIONS', [
        `${chalk.cyan('[1]')} Use 50% of balance (keep 1 USDT for fees)`,
        `${chalk.cyan('[2]')} Use 100% of balance (keep 1 USDT for fees)`,
        `${chalk.cyan('[3]')} Return to main menu`
    ], 'blue');
    
    const choice = await question(chalk.yellow('Enter your choice (1-3): '));
    return choice.trim();
}

// Main function
async function main() {
    // Clear the console
    console.clear();
    
    // Show banner
    showBanner();
    
    // Check IP whitelist first
    const licenseStatus = await checkIPWhitelist();
    if (!licenseStatus.valid) {
        logWithTime('License validation failed. Exiting.', 'error');
        return;
    }
    
    // Read token
    const token = readToken();
    const headers = {
        'authorization': `Bearer ${token}`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'accept': 'application/json, text/plain, */*',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'content-type': 'application/json',
        'sec-ch-ua-mobile': '?0',
        'origin': 'https://app.testnet.liqfinity.com',
        'referer': 'https://app.testnet.liqfinity.com/',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    // Main configuration
    const minAmount = 10; // Minimum amount for processing
    const maxAmount = 100000;
    const safetyBuffer = 1; // Keep 1 USDT as buffer for fees
    let sleepBetweenOperations = 30000; // 30 seconds
    let cycleCount = 0;
    
    // Strategy configuration (will be modified based on user selection)
    const strategy = {
        enableLock: false,
        enableBorrow: false,
        lockPercentage: 1.0,      // Default: use 100% of available balance
        borrowCycleTime: 3600000, // 1 hour in milliseconds - optimal time for hourly points
        minRepayTime: 600000,     // 10 minutes in milliseconds - minimum time to hold loan
        maxActiveLoans: 5,        // Maximum number of active loans to maintain at once
        preferLiquidity: true,    // Prioritize liquidity operations over loans when low on balance
        displayOnly: false        // Only display information, don't perform operations
    };
    
    // Display initial wallet info
    await fetchWalletInfo(headers);
    await fetchPoints(headers);
    
    // Show main menu
    let mainMenuChoice = await showMainMenu();
    
    while (mainMenuChoice !== '5') {
        switch (mainMenuChoice) {
            case '1': // Lock & Unlock only
                strategy.enableLock = true;
                strategy.enableBorrow = false;
                strategy.displayOnly = false;
                
                // Show lock/unlock options
                const lockUnlockChoice = await showLockUnlockMenu();
                
                if (lockUnlockChoice === '1') {
                    strategy.lockPercentage = 0.5; // Use 50% of balance
                    logWithTime('Selected: Lock/Unlock with 50% of balance', 'info');
                } else if (lockUnlockChoice === '2') {
                    strategy.lockPercentage = 1.0; // Use 100% of balance
                    logWithTime('Selected: Lock/Unlock with 100% of balance', 'info');
                } else {
                    // Return to main menu
                    mainMenuChoice = await showMainMenu();
                    continue;
                }
                break;
                
            case '2': // Borrow & Repay only
                strategy.enableLock = false;
                strategy.enableBorrow = true;
                strategy.displayOnly = false;
                logWithTime('Selected: Borrow & Repay operations only', 'info');
                break;
                
            case '3': // Both Lock/Unlock & Borrow/Repay
                strategy.enableLock = true;
                strategy.enableBorrow = true;
                strategy.displayOnly = false;
                
                // Show lock/unlock options
                const combinedLockChoice = await showLockUnlockMenu();
                
                if (combinedLockChoice === '1') {
                    strategy.lockPercentage = 0.5; // Use 50% of balance
                    logWithTime('Selected: Combined operations with 50% of balance for Lock/Unlock', 'info');
                } else if (combinedLockChoice === '2') {
                    strategy.lockPercentage = 1.0; // Use 100% of balance
                    logWithTime('Selected: Combined operations with 100% of balance for Lock/Unlock', 'info');
                } else {
                    // Return to main menu
                    mainMenuChoice = await showMainMenu();
                    continue;
                }
                break;
                
            case '4': // Display User Information Only
                strategy.enableLock = false;
                strategy.enableBorrow = false;
                strategy.displayOnly = true;
                logWithTime('Selected: Display User Information Only', 'info');
                
                // Show user information
                await fetchWalletInfo(headers);
                await fetchPoints(headers);
                await fetchActiveLoans(headers);
                
                console.log('\n');
                logWithTime('Press any key to return to the main menu...', 'info');
                await question('');
                
                // Return to main menu
                mainMenuChoice = await showMainMenu();
                continue;
                
            default:
                logWithTime('Invalid choice. Please try again.', 'warning');
                mainMenuChoice = await showMainMenu();
                continue;
        }
        
        // Print selected strategy
        printBox('SELECTED STRATEGY', [
            `Liquidity Mining: ${strategy.enableLock ? chalk.green('ENABLED') : chalk.red('DISABLED')}`,
            `Lock Percentage: ${chalk.yellow((strategy.lockPercentage * 100).toFixed(0))}%`,
            `Borrowing: ${strategy.enableBorrow ? chalk.green('ENABLED') : chalk.red('DISABLED')}`,
            `Borrow Cycle Time: ${chalk.yellow((strategy.borrowCycleTime/60000).toFixed(0))} minutes`,
            `Min Repay Time: ${chalk.yellow((strategy.minRepayTime/60000).toFixed(0))} minutes`,
            `Max Active Loans: ${chalk.yellow(strategy.maxActiveLoans)}`
        ], 'magenta');
        
        if (strategy.displayOnly) {
            logWithTime('Display mode only. Returning to main menu.', 'info');
            mainMenuChoice = await showMainMenu();
            continue;
        }
        
        // Ask user to confirm
        const confirm = await question(chalk.yellow('Start operations with these settings? (y/n): '));
        
        if (confirm.toLowerCase() !== 'y') {
            logWithTime('Operation cancelled. Returning to main menu.', 'info');
            mainMenuChoice = await showMainMenu();
            continue;
        }
        
        logWithTime('Starting operations...', 'success');
        
        let consecutiveErrors = 0;
        let consecutiveSuccesses = 0;
        const maxConsecutiveErrors = 5;
        
        // Keep track of loan timestamps for hourly optimization
        let loanTimestamps = {};
        
        // Main operation loop
        let running = true;
        
        while (running) {
            try {
                cycleCount++;
                // Format date in WIB timezone for display
                const nowWIB = new Date();
                const dateOptions = { 
                    timeZone: 'Asia/Jakarta',
                    hour12: false,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                };
                const timeWIB = nowWIB.toLocaleString('id-ID', dateOptions);
                
                printBox('NEW CYCLE', [`Cycle #${cycleCount}`, `Time: ${timeWIB} (WIB)`], 'yellow');
                
                // Get latest wallet info
                const walletInfo = await fetchWalletInfo(headers);
                if (!walletInfo) {
                    logWithTime('Failed to fetch wallet info. Skipping cycle.', 'error');
                    consecutiveErrors++;
                    await delay(sleepBetweenOperations);
                    continue;
                }
                
                // Update points
                await fetchPoints(headers);
                
                const availableBalance = walletInfo.balance;
                const activeStakeBalance = walletInfo.activeStakeBalance;
                
                // ESCAPE OPTION: Allow user to exit by pressing Ctrl+C
                process.stdout.write(chalk.yellow('Press Ctrl+C to stop and return to menu\n'));
                
                // Step 1: Handle Liquidity Mining (Lock/Unlock) if enabled
                if (strategy.enableLock) {
                    // IMPROVED LOGIC: Check if we have staked balance first
                    let skipLock = false;
                    if (activeStakeBalance >= minAmount) {
                        // If we have significant staked balance, we can skip lock and go straight to unlock
                        if (availableBalance <= safetyBuffer + 1) {
                            logWithTime(`Low available balance (${availableBalance.toLocaleString('en-US', {maximumFractionDigits: 2})}) but have staked balance (${activeStakeBalance.toLocaleString('en-US', {maximumFractionDigits: 2})}). Skipping lock, proceeding to unlock.`, 'info');
                            skipLock = true;
                        }
                    }
                    
                    let lockSuccess = false;
                    
                    // Lock phase (if not skipped)
                    if (!skipLock) {
                        // Check if we have enough balance to lock
                        if (availableBalance <= safetyBuffer + 1) {
                            logWithTime(`Available balance (${availableBalance.toLocaleString('en-US', {maximumFractionDigits: 2})}) is too low. Skipping lock.`, 'warning');
                        } else {
                            // Calculate lock amount based on selected percentage
                            let lockAmount = (availableBalance - safetyBuffer) * strategy.lockPercentage;
                            
                            // If borrowing is enabled, reserve some balance for borrowing operations
                            if (strategy.enableBorrow) {
                                const reserveForBorrowingAmount = Math.min(10000, availableBalance * 0.2); // 20% or max 10,000 USDT
                                if (availableBalance > (reserveForBorrowingAmount + safetyBuffer + 10)) {
                                    lockAmount = (availableBalance - reserveForBorrowingAmount - safetyBuffer) * strategy.lockPercentage;
                                    logWithTime(`Reserving ${reserveForBorrowingAmount.toLocaleString('en-US', {maximumFractionDigits: 2})} USDT for borrowing operations`, 'info');
                                }
                            }
                            
                            if (lockAmount >= minAmount) {
                                // Validate lock
                                const lockValidation = await validateLock(headers, lockAmount);
                                if (!lockValidation) {
                                    logWithTime('Lock validation failed. Skipping lock.', 'error');
                                } else {
                                    // Create lock
                                    const lock = await createLock(headers, lockValidation.amount, lockValidation.fee);
                                    if (lock) {
                                        logWithTime('Lock operation successful!', 'success');
                                        lockSuccess = true;
                                        consecutiveSuccesses++;
                                        consecutiveErrors = 0;
                                    } else {
                                        logWithTime('Lock operation failed.', 'error');
                                        consecutiveErrors++;
                                        consecutiveSuccesses = 0;
                                    }
                                    
                                    // Update points after lock
                                    await fetchPoints(headers);
                                    
                                    // Only wait before unlocking if we did a lock
                                    logWithTime(`Waiting ${sleepBetweenOperations/1000} seconds before unlocking...`, 'info');
                                    await delay(sleepBetweenOperations);
                                }
                            } else {
                                logWithTime(`Lock amount (${lockAmount.toLocaleString('en-US', {maximumFractionDigits: 2})}) is too low after reserving for borrowing. Skipping lock.`, 'warning');
                            }
                        }
                    }
                    
                    // Get latest wallet info again if we did a lock (to see staked balance)
                    // or if we're checking for the first time after skipping lock
                    const updatedWalletInfo = await fetchWalletInfo(headers);
                    if (!updatedWalletInfo) {
                        logWithTime('Failed to fetch updated wallet info. Skipping unlock.', 'error');
                        consecutiveErrors++;
                    } else {
                        // Check active stake balance
                        const currentStakeBalance = updatedWalletInfo.activeStakeBalance;
                        if (!currentStakeBalance || currentStakeBalance < minAmount) {
                            logWithTime(`Active stake balance (${currentStakeBalance?.toLocaleString('en-US', {maximumFractionDigits: 2})}) is too low. Skipping unlock.`, 'warning');
                        } else {
                            // Calculate unlock amount - use 100% of staked balance
                            const unlockAmount = currentStakeBalance;
                            
                            // Validate unlock
                            const unlockValidation = await validateUnlock(headers, unlockAmount);
                            if (!unlockValidation) {
                                logWithTime('Unlock validation failed. Skipping unlock.', 'error');
                            } else {
                                // Create unlock
                                const unlock = await createUnlock(headers, unlockValidation.amount, unlockValidation.fee);
                                if (unlock) {
                                    logWithTime('Unlock operation successful!', 'success');
                                    consecutiveSuccesses++;
                                    consecutiveErrors = 0;
                                } else {
                                    logWithTime('Unlock operation failed.', 'error');
                                    consecutiveErrors++;
                                    consecutiveSuccesses = 0;
                                }
                                
                                // Update points after unlock
                                await fetchPoints(headers);
                            }
                        }
                    }
                }
                
                // Step 2: Handle Borrowing Operations (if enabled)
                if (strategy.enableBorrow) {
                    // Get updated wallet info after liquidity operations
                    const currentWalletInfo = await fetchWalletInfo(headers);
                    if (!currentWalletInfo) {
                        logWithTime('Failed to fetch wallet info for borrowing. Skipping borrow.', 'error');
                    } else {
                        const currentBalance = currentWalletInfo.balance;
                        
                        // Fetch active loans
                        const activeLoans = await fetchActiveLoans(headers);
                        
                        // Check if any loans need to be repaid
                        if (activeLoans.length > 0) {
                            // Find loans that have been active for the optimal time (hourly refresh)
                            const now = Date.now();
                            const loansToRepay = activeLoans.filter(loan => {
                                // If we have a timestamp for this loan, check if it's been long enough
                                if (loanTimestamps[loan.id]) {
                                    return (now - loanTimestamps[loan.id]) >= strategy.minRepayTime;
                                }
                                // If we don't have a timestamp (older loans), repay if the status is ACTIVE
                                return true;
                            });
                            
                            if (loansToRepay.length > 0) {
                                logWithTime(`Found ${loansToRepay.length} loans eligible for repayment`, 'info');
                                
                                // Sort by oldest first
                                loansToRepay.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                                
                                // Repay the oldest loan
                                const loanToRepay = loansToRepay[0];
                                
                                if (currentBalance >= loanToRepay.repaymentAmount) {
                                    const repaid = await repayLoan(headers, loanToRepay.id, loanToRepay.repaymentAmount);
                                    if (repaid) {
                                        logWithTime('Loan repayment successful!', 'success');
                                        delete loanTimestamps[loanToRepay.id]; // Remove from tracking
                                        
                                        // Update points after repay
                                        await fetchPoints(headers);
                                    }
                                } else {
                                    logWithTime(`Insufficient balance (${currentBalance.toLocaleString('en-US', {maximumFractionDigits: 2})}) to repay loan (${loanToRepay.repaymentAmount.toLocaleString('en-US', {maximumFractionDigits: 2})}). Skipping repay.`, 'warning');
                                }
                            }
                        }
                        
                        // Check if we should create a new loan
                        if (activeLoans.length < strategy.maxActiveLoans) {
                            // First try with primary method
                            let collateral = await checkCollaterals(headers);
                            
                            // If that fails, try the alternative method
                            if (!collateral) {
                                logWithTime('Trying alternative method to find collaterals', 'info');
                                collateral = await checkAvailableCollaterals(headers);
                            }
                            
                            if (collateral && collateral.collateralAvailable > 0) {
                                // Use exact borrow validation based on manual successful approach
                                const borrowValidation = await validateBorrowExact(
                                    headers, 
                                    collateral.code, 
                                    collateral.collateralAvailable
                                );
                                
                                if (borrowValidation) {
                                    // Use improved borrow confirmation with exact same values
                                    const loan = await confirmBorrowImproved(
                                        headers, 
                                        collateral.code, 
                                        borrowValidation.collateralAmount || collateral.collateralAvailable, 
                                        borrowValidation.principalAmount
                                    );
                                    
                                    if (loan) {
                                        logWithTime('Borrow operation successful!', 'success');
                                        // Remember when we created this loan
                                        loanTimestamps[loan.id] = Date.now();
                                        
                                        // Update points after borrow
                                        await fetchPoints(headers);
                                    }
                                }
                            } else {
                                logWithTime('No suitable collateral found for borrowing', 'info');
                            }
                        } else {
                            logWithTime(`Already have maximum number of active loans (${activeLoans.length}/${strategy.maxActiveLoans})`, 'info');
                        }
                    }
                }
                
                // Check if we've had too many consecutive errors
                if (consecutiveErrors >= maxConsecutiveErrors) {
                    logWithTime(`Too many consecutive errors (${consecutiveErrors}). Pausing for 5 minutes before retrying...`, 'error');
                    await delay(300000); // 5 minutes
                    consecutiveErrors = 0;
                    consecutiveSuccesses = 0;
                }
                
                // Wait before next cycle
                logWithTime(`Waiting ${sleepBetweenOperations/1000} seconds before next cycle...`, 'info');
                await delay(sleepBetweenOperations);
                
                // For trial users, show remaining time
                if (!licenseStatus.permanent) {
                    const now = new Date();
                    const remainingMs = licenseStatus.trialEnd - now;
                    if (remainingMs > 0) {
                        const remainingMinutes = Math.floor(remainingMs / 60000);
                        logWithTime(`Trial time remaining: ${remainingMinutes} minutes`, 'warning');
                    }
                }
                
            } catch (error) {
                if (error.code === 'SIGINT') {
                    // User pressed Ctrl+C to exit
                    logWithTime('Operation stopped by user. Returning to main menu...', 'info');
                    running = false;
                } else {
                    logWithTime('Unexpected error in main loop', 'error');
                    console.log(error);
                    consecutiveErrors++;
                    await delay(60000); // Wait 1 minute before retrying after unexpected error
                }
            }
        }
        
        // After exiting the loop, show the main menu again
        mainMenuChoice = await showMainMenu();
    }
    
    // Close readline interface
    rl.close();
    
    logWithTime('Exiting program. Thank you for using Liqfinity Bot!', 'success');
}

// Handle SIGINT (Ctrl+C) globally to allow exiting from menu
process.on('SIGINT', function() {
    console.log('\n');
    logWithTime('Program interrupted by user. Exiting...', 'warning');
    process.exit(0);
});

// Run main function
main();