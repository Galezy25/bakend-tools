import express from 'express';

import CRUD from '../crud.interface';

export const defaultFind = (collection: CRUD): express.RequestHandler => async (
    req,
    res,
    next
) => {
    try {
        let data = await collection.find({ ...req.query, ...req.params });
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const defaultFindOne = (
    collection: CRUD
): express.RequestHandler => async (req, res, next) => {
    try {
        let data = await collection.findOne({ ...req.query, ...req.params });
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const defaultCount = (
    collection: CRUD
): express.RequestHandler => async (req, res, next) => {
    try {
        let data = await collection.count({ ...req.query, ...req.params });
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const defaultCreate = (
    collection: CRUD,
    idName?: string
): express.RequestHandler => async (req, res, next) => {
    try {
        let data: any = await collection.create(req.body);
        const { insertId } = data;
        if (idName) {
            data = await collection.findOne({ [idName]: insertId });
        }
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

export const defaultModify = (
    collection: CRUD
): express.RequestHandler => async (req, res, next) => {
    try {
        await collection.update({ ...req.query, ...req.params }, req.body);
        res.sendStatus(200);
    } catch (error) {
        next(error);
    }
};

export const defaultReplace = (
    collection: CRUD
): express.RequestHandler => async (req, res, next) => {
    try {
        await collection.replace({ ...req.body, ...req.params });
        res.sendStatus(200);
    } catch (error) {
        next(error);
    }
};

export const defaultRemove = (
    collection: CRUD
): express.RequestHandler => async (req, res, next) => {
    try {
        await collection.delete({ ...req.query, ...req.params });
        res.sendStatus(200);
    } catch (error) {
        next(error);
    }
};
