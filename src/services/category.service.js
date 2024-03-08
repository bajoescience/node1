const {Category} = require('../models/category.model');
const {User} = require('../models/user.model');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const _ = require('lodash');

const select_options = ['-createdAt', '-updatedAt', '-__v'];

module.exports = {
    getAllCategories: async () => {
        return await Category.find({}).select(select_options);
    },

    createCategory: async params => {
        const newCategory = new Category(params);
        await newCategory.save();
        return newCategory;
    },

    getCategory: async name => {
        return await Category.findOne({name}).select(select_options);
    },

    addPreference: async (username, categoryId) => {
        const user = await User.findOne({username});
        if(!user) throw new ApiError(httpStatus.NOT_FOUND, `${username} not found`);
        // check if the user already has the preference
        user.preferences.push(categoryId);

        return user;
    },

    removePreference: async (username, categoryId) => {
        const user = await User.findOne({username});
        if(!user) throw new ApiError(httpStatus.NOT_FOUND, `${username} not found`);
        _.remove
    }
}