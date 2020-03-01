function resolveImmediate(callback: () => void) {
    setTimeout(() => {
        try {
            callback();
        } catch (error) {
            throwNext(error);
        }
    }, 0);

    //resolvedPromise.then(callback).catch(throwNext);
}

function throwNext(error) {
    setTimeout(() => {
        throw error;
    }, 0);
}
export default resolveImmediate;
