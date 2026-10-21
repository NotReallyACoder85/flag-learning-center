import Foundation
import CoreGraphics

// Walk the drawing instructions of each PDF page and dump every painted path as JSON.
struct Rec { var op: String; var stroke: [Double]; var fill: [Double]; var lw: Double; var subpaths: [[[Double]]] }

final class State {
    var ctm = CGAffineTransform.identity
    var stack: [(CGAffineTransform, [Double], [Double], Double)] = []
    var stroke: [Double] = [0,0,0], fill: [Double] = [0,0,0]
    var lw = 1.0
    var cur: [[[Double]]] = []   // subpaths of points (already transformed)
    var pt = CGPoint.zero, start = CGPoint.zero
    var out: [Rec] = []
    func tp(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x, y: y).applying(ctm) }
    func add(_ p: CGPoint) { if cur.isEmpty { cur.append([]) }; cur[cur.count-1].append([Double(p.x), Double(p.y)]) }
}

func nums(_ s: OpaquePointer, _ n: Int) -> [Double] {
    var v = [Double](repeating: 0, count: n)
    for i in stride(from: n-1, through: 0, by: -1) { var d: CGPDFReal = 0; CGPDFScannerPopNumber(s, &d); v[i] = Double(d) }
    return v
}

func get(_ i: UnsafeMutableRawPointer?) -> State { Unmanaged<State>.fromOpaque(i!).takeUnretainedValue() }
func finish(_ i: UnsafeMutableRawPointer?, _ kind: String) {
    let s = get(i)
    if !s.cur.isEmpty && kind != "n" { s.out.append(Rec(op: kind, stroke: s.stroke, fill: s.fill, lw: s.lw, subpaths: s.cur)) }
    s.cur = []
}

func run(page: CGPDFPage) -> [Rec] {
    let st = State()
    let table = CGPDFOperatorTableCreate()!
    let info = Unmanaged.passUnretained(st).toOpaque()
    func reg(_ name: String, _ cb: @escaping CGPDFOperatorCallback) { CGPDFOperatorTableSetCallback(table, name, cb) }
    reg("q") { _, i in let s = get(i); s.stack.append((s.ctm, s.stroke, s.fill, s.lw)) }
    reg("Q") { _, i in let s = get(i); if let t = s.stack.popLast() { s.ctm = t.0; s.stroke = t.1; s.fill = t.2; s.lw = t.3 } }
    reg("cm") { sc, i in let s = get(i); let v = nums(sc, 6); s.ctm = CGAffineTransform(a: v[0], b: v[1], c: v[2], d: v[3], tx: v[4], ty: v[5]).concatenating(s.ctm) }
    reg("w") { sc, i in get(i).lw = nums(sc, 1)[0] }
    reg("RG") { sc, i in get(i).stroke = nums(sc, 3) }
    reg("rg") { sc, i in get(i).fill = nums(sc, 3) }
    reg("G") { sc, i in let g = nums(sc, 1)[0]; get(i).stroke = [g,g,g] }
    reg("g") { sc, i in let g = nums(sc, 1)[0]; get(i).fill = [g,g,g] }
    reg("m") { sc, i in let s = get(i); let v = nums(sc, 2); let p = s.tp(v[0], v[1]); s.cur.append([]); s.add(p); s.pt = p; s.start = p }
    reg("l") { sc, i in let s = get(i); let v = nums(sc, 2); let p = s.tp(v[0], v[1]); s.add(p); s.pt = p }
    reg("c") { sc, i in
        let s = get(i); let v = nums(sc, 6)
        let p1 = s.tp(v[0], v[1]), p2 = s.tp(v[2], v[3]), p3 = s.tp(v[4], v[5]), p0 = s.pt
        for k in 1...8 { let t = CGFloat(k)/8, u = 1-t
            let x = u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x
            let y = u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
            s.add(CGPoint(x: x, y: y)) }
        s.pt = p3 }
    reg("v") { sc, i in
        let s = get(i); let v = nums(sc, 4)
        let p1 = s.pt, p2 = s.tp(v[0], v[1]), p3 = s.tp(v[2], v[3]), p0 = s.pt
        for k in 1...8 { let t = CGFloat(k)/8, u = 1-t
            let x = u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x
            let y = u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
            s.add(CGPoint(x: x, y: y)) }
        s.pt = p3 }
    reg("y") { sc, i in
        let s = get(i); let v = nums(sc, 4)
        let p1 = s.tp(v[0], v[1]), p3 = s.tp(v[2], v[3]), p2 = s.tp(v[2], v[3]), p0 = s.pt
        for k in 1...8 { let t = CGFloat(k)/8, u = 1-t
            let x = u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x
            let y = u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
            s.add(CGPoint(x: x, y: y)) }
        s.pt = p3 }
    reg("h") { _, i in let s = get(i); if !s.cur.isEmpty { s.add(s.start); s.pt = s.start } }
    reg("re") { sc, i in
        let s = get(i); let v = nums(sc, 4)
        let a = s.tp(v[0], v[1]), b = s.tp(v[0]+v[2], v[1]), c = s.tp(v[0]+v[2], v[1]+v[3]), d = s.tp(v[0], v[1]+v[3])
        s.cur.append([]); [a,b,c,d,a].forEach { s.add($0) } }
    reg("S") { _, i in finish(i, "S") }
    reg("s") { _, i in finish(i, "S") }
    reg("f") { _, i in finish(i, "f") }
    reg("F") { _, i in finish(i, "f") }
    reg("f*") { _, i in finish(i, "f") }
    reg("B") { _, i in finish(i, "B") }
    reg("B*") { _, i in finish(i, "B") }
    reg("b") { _, i in finish(i, "B") }
    reg("b*") { _, i in finish(i, "B") }
    reg("n") { _, i in finish(i, "n") }
    let cs = CGPDFContentStreamCreateWithPage(page)
    let scanner = CGPDFScannerCreate(cs, table, info)
    CGPDFScannerScan(scanner)
    CGPDFScannerRelease(scanner); CGPDFContentStreamRelease(cs)
    return st.out
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
let outDir = CommandLine.arguments[2]
guard let doc = CGPDFDocument(url as CFURL) else { print("cannot open"); exit(1) }
for p in 1...doc.numberOfPages {
    guard let page = doc.page(at: p) else { continue }
    let box = page.getBoxRect(.mediaBox)
    let recs = run(page: page)
    let arr: [[String: Any]] = recs.map { ["op": $0.op, "stroke": $0.stroke, "fill": $0.fill, "lw": $0.lw, "sub": $0.subpaths] }
    let obj: [String: Any] = ["w": Double(box.width), "h": Double(box.height), "recs": arr]
    let data = try! JSONSerialization.data(withJSONObject: obj, options: [])
    try! data.write(to: URL(fileURLWithPath: String(format: "%@/v%02d.json", outDir, p)))
}
print("pages", doc.numberOfPages)
