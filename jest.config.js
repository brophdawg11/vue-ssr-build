module.exports = {
    collectCoverage: true,
    collectCoverageFrom: [ 'src/**/*.{js,vue}' ],
    globals: {
        NODE_ENV: 'test',
    },
    moduleDirectories: [
        'node_modules',
        'src',
    ],
    moduleNameMapper: {
        '^vue$': '<rootDir>/node_modules/vue/dist/vue.common.js',
        '^@server/(.*)$': '<rootDir>/server/$1',
        '^@src/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@js/(.*)$': '<rootDir>/src/js/$1',
        '^@store/(.*)$': '<rootDir>/src/store/$1',
        '^@dist/(.*)$': '<rootDir>/dist/$1',
    },
    snapshotSerializers: [ 'jest-serializer-vue' ],
    transform: {
        '^.+\\.vue$': 'vue-jest',
        '^.+\\.js?$': 'babel-jest',
    },
    transformIgnorePatterns: [
        'node_modules/(?!lodash-es)',
    ],
    verbose: true,
};
