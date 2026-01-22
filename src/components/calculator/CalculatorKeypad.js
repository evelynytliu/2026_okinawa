"use client";
import React, { useState, useEffect } from 'react';
import { X, Delete, Check } from 'lucide-react';
import styles from './CalculatorKeypad.module.css';

export default function CalculatorKeypad({ initialValue, onValueChange, onConfirm, onClose }) {
    const [display, setDisplay] = useState(initialValue?.toString() || '');

    const calculate = (expr) => {
        try {
            let cleanExpr = expr;
            // cleanup trailing ops
            if (/[\+\-\*\/]$/.test(cleanExpr)) {
                cleanExpr = cleanExpr.slice(0, -1);
            }
            if (!cleanExpr) return '';

            // basic validation
            if (!/^[0-9+\-*/.() ]+$/.test(cleanExpr)) return expr;

            const result = new Function('return ' + cleanExpr)();
            if (isFinite(result)) {
                return Math.round(result * 100) / 100 + '';
            }
        } catch (e) { }
        return expr;
    };

    const handlePress = (key) => {
        if (key === 'C') {
            setDisplay('');
            return;
        }
        if (key === 'BACK') {
            setDisplay(prev => prev.slice(0, -1));
            return;
        }
        if (key === '=') {
            const res = calculate(display);
            setDisplay(res);
            return;
        }
        if (key === 'OK') {
            if (/[\+\-\*\/]/.test(display)) {
                // Calculate before confirm
                const res = calculate(display);
                setDisplay(res);
                onValueChange(res); // Ensure parent has final numeric value
                onConfirm(res);
            } else {
                onConfirm(display);
            }
            return;
        }

        // Prevent multiple decimals in one number segment?
        // Logic: if key is '.', check if last segment has '.'
        if (key === '.') {
            const parts = display.split(/[\+\-\*\/]/);
            const lastPart = parts[parts.length - 1];
            if (lastPart.includes('.')) return;
        }

        setDisplay(prev => prev + key);
    };

    useEffect(() => {
        onValueChange(display);
    }, [display, onValueChange]);

    const formatDisplay = (val) => {
        if (!val) return '0';
        return val.replace(/\*/g, '×').replace(/\//g, '÷');
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={e => e.stopPropagation()}>
                <div className={styles.header} style={{ justifyContent: 'flex-end' }}>
                    <button className={styles.btnClose} onClick={onClose}><X size={24} /></button>
                </div>



                <div className={styles.grid}>
                    <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handlePress('C')}>C</button>
                    <button className={`${styles.btn} ${styles.btnOp}`} onClick={() => handlePress('/')}>÷</button>
                    <button className={`${styles.btn} ${styles.btnOp}`} onClick={() => handlePress('*')}>×</button>
                    <button className={`${styles.btn} ${styles.btnAction}`} onClick={() => handlePress('BACK')}><Delete size={24} /></button>

                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('7')}>7</button>
                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('8')}>8</button>
                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('9')}>9</button>
                    <button className={`${styles.btn} ${styles.btnOp}`} onClick={() => handlePress('-')}>−</button>

                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('4')}>4</button>
                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('5')}>5</button>
                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('6')}>6</button>
                    <button className={`${styles.btn} ${styles.btnOp}`} onClick={() => handlePress('+')}>+</button>

                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('1')}>1</button>
                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('2')}>2</button>
                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('3')}>3</button>
                    <button className={`${styles.btn} ${styles.btnOp}`} onClick={() => handlePress('=')}>=</button>

                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('0')}>0</button>
                    <button className={`${styles.btn} ${styles.btnNum}`} onClick={() => handlePress('.')}>.</button>

                    <button className={`${styles.btn} ${styles.btnSubmit}`} onClick={() => handlePress('OK')}>
                        <Check size={24} style={{ marginRight: 8 }} /> 確認
                    </button>
                </div>
            </div>
        </div>
    );
}
