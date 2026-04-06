import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import { encrypt } from './handlePassword.js';
import {
    generateAccessToken,
    generatRefreshToken,
    getRefreshTokenExpiry
} from './handleJwt.js';

export const generateVerificationCode = () =>
    String(Math.floor(100000 + Math.random() * 900000));

export const restoreDeletedUserAndIssueSession = async ({ existingUser, plainPassword, ipAddress }) => {
    const encryptedPassword = await encrypt(plainPassword);
    const verificationCode = generateVerificationCode();

    const restoredUser = await User.restoreById(existingUser._id);

    if (!restoredUser) {
        throw new Error('RESTORE_FAILED_USER_NOT_FOUND');
    }

    restoredUser.set({
        password: encryptedPassword,
        verificationCode,
        verificationAttempts: 3,
        status: 'pending'
    });

    await restoredUser.save();

    const accessToken = generateAccessToken(restoredUser);
    const refreshToken = generatRefreshToken(restoredUser);

    await RefreshToken.create({
        userRef: restoredUser._id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
        createdByIp: ipAddress
    });

    restoredUser.set('password', undefined, { strict: false });

    return {
        accessToken,
        refreshToken,
        restoredUser
    };
};

export const deleteUserByMode = async ({ userId, deletedBy, soft }) => {
    if (soft) {
        const deletedUser = await User.softDeleteById(userId, deletedBy);
        return { deletedUser, soft: true };
    }

    const deletedUser = await User.hardDelete(userId);
    return { deletedUser, soft: false };
};
