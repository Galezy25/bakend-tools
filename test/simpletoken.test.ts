import SimpleToken from '../src/simpletoken'


describe("Simple token tests",()=>{
    const st = new SimpleToken<{test : number}>("constant")
    test("Token no expirable",async ()=>{
        const token = st.sign({test : 0})
        expect(token).toBe("TmFO.eyJ0ZXN0IjowfQ==.ZDE3ZjFhYmU4NWRiYTQyNzYyMjVhY2ZmZDc1NjIxZGE=");
        const payload = await st.verify(token);
        expect(payload.test).toBe(0)
    })

    test("Token expirable",async ()=>{
        jest.setTimeout(5000)
        const token = st.sign({test:0},2);
        const payload = await st.verify(token);
        expect(payload.test).toBe(0);
        await new Promise(r => setTimeout(r,3000));
        await expect(st.verify(token)).rejects.toMatchObject({code : 403});
    })

    test("Token altered",async ()=>{
        let [exp, payload, sign] = st.sign({test:0},3).split('.');
        payload = Buffer.from(JSON.stringify({test:1})).toString('base64');
        await expect(st.verify(exp + '.' + payload + '.' + sign)).rejects.toMatchObject({code : 401});
    })
})
