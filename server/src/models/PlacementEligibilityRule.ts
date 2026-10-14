import { db, Collections } from '../config/firebase.js';
import { dateFromFirestore, cleanDataForFirestore } from './firestoreHelper.js';

export interface IPlacementEligibilityRule {
  _id: string;
  minCgpa: number;
  allowedDepartments: string[];
  maxBacklogs: number;
  graduationBatchYear: number;
  oneJobPolicy: boolean;
  dreamOfferMultiplier: number;
  isActive: boolean;
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;
  save(): Promise<IPlacementEligibilityRule>;
}

export class PlacementEligibilityRuleDoc implements IPlacementEligibilityRule {
  _id: string;
  minCgpa: number;
  allowedDepartments: string[];
  maxBacklogs: number;
  graduationBatchYear: number;
  oneJobPolicy: boolean;
  dreamOfferMultiplier: number;
  isActive: boolean;
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;

  constructor(data: any, id: string) {
    this._id = id;
    this.minCgpa = typeof data.minCgpa === 'number' ? data.minCgpa : 6.0;
    this.allowedDepartments = Array.isArray(data.allowedDepartments) ? data.allowedDepartments : [];
    this.maxBacklogs = typeof data.maxBacklogs === 'number' ? data.maxBacklogs : 0;
    this.graduationBatchYear = typeof data.graduationBatchYear === 'number' ? data.graduationBatchYear : new Date().getFullYear();
    this.oneJobPolicy = data.oneJobPolicy ?? false;
    this.dreamOfferMultiplier = typeof data.dreamOfferMultiplier === 'number' ? data.dreamOfferMultiplier : 1.5;
    this.isActive = data.isActive ?? true;
    this.updatedBy = data.updatedBy;
    this.createdAt = data.createdAt ? dateFromFirestore(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? dateFromFirestore(data.updatedAt) : new Date();
  }

  async save(): Promise<IPlacementEligibilityRule> {
    this.updatedAt = new Date();
    const data = cleanDataForFirestore({
      minCgpa: this.minCgpa,
      allowedDepartments: this.allowedDepartments,
      maxBacklogs: this.maxBacklogs,
      graduationBatchYear: this.graduationBatchYear,
      oneJobPolicy: this.oneJobPolicy,
      dreamOfferMultiplier: this.dreamOfferMultiplier,
      isActive: this.isActive,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });

    await db.collection(Collections.ELIGIBILITY_RULES).doc(this._id).set(data, { merge: true });
    return this;
  }
}

export const PlacementEligibilityRule = {
  async getEffectiveRule(): Promise<PlacementEligibilityRuleDoc> {
    const snapshot = await db.collection(Collections.ELIGIBILITY_RULES).doc('default_campus_rule').get();
    if (!snapshot.exists) {
      const defaultRule = new PlacementEligibilityRuleDoc(
        {
          minCgpa: 6.0,
          allowedDepartments: [],
          maxBacklogs: 1,
          graduationBatchYear: new Date().getFullYear(),
          oneJobPolicy: false,
          dreamOfferMultiplier: 1.5,
          isActive: true,
        },
        'default_campus_rule'
      );
      await defaultRule.save();
      return defaultRule;
    }
    return new PlacementEligibilityRuleDoc(snapshot.data(), snapshot.id);
  },

  async updateRule(data: Partial<IPlacementEligibilityRule>, updatedBy?: string): Promise<PlacementEligibilityRuleDoc> {
    const rule = await this.getEffectiveRule();
    if (typeof data.minCgpa === 'number') rule.minCgpa = data.minCgpa;
    if (Array.isArray(data.allowedDepartments)) rule.allowedDepartments = data.allowedDepartments;
    if (typeof data.maxBacklogs === 'number') rule.maxBacklogs = data.maxBacklogs;
    if (typeof data.graduationBatchYear === 'number') rule.graduationBatchYear = data.graduationBatchYear;
    if (typeof data.oneJobPolicy === 'boolean') rule.oneJobPolicy = data.oneJobPolicy;
    if (typeof data.dreamOfferMultiplier === 'number') rule.dreamOfferMultiplier = data.dreamOfferMultiplier;
    if (typeof data.isActive === 'boolean') rule.isActive = data.isActive;
    if (updatedBy) rule.updatedBy = updatedBy;

    await rule.save();
    return rule;
  },
};
