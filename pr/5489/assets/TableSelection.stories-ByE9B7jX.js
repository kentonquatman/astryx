import{i as e,s as t}from"./preload-helper-CT_b8DTk.js";import{t as n}from"./react-B7Te67-h.js";import{t as r}from"./jsx-runtime-DqZldVDK.js";import{t as i}from"./Button-BPD_GmpK.js";import{t as a}from"./Button-CIR94wUk.js";import{t as o}from"./Table-Nz1Wbf7n.js";import{Tt as s,dn as c,ln as l}from"./iframe-CU3GH5K0.js";function u({layout:e,selectedKeys:t,clearSelection:n}){return t.size===0?null:(0,p.jsxs)(`div`,{...{0:{className:`x78zum5 x6s0dn4 xjcht0a xh8yej3 x1k15mir x9f619 xce4md1 x1pzlopt x1de1mus x18cjml8`},1:{className:`x78zum5 x6s0dn4 xjcht0a xh8yej3 x1k15mir x9f619 xce4md1 x1pzlopt x1de1mus x18cjml8 x7wzq59 x3qf9w x3gu8xl x1hll5pv x1355qak xh6dtrn x14hfi27`}}[(e===`floating`)<<0],"data-layout":e,role:`toolbar`,"aria-label":`Bulk actions`,children:[(0,p.jsx)(`div`,{className:`x78zum5 x6s0dn4 x1txdalj`,children:e===`floating`?(0,p.jsx)(i,{label:`Approve`,size:`sm`,variant:`ghost`,onClick:()=>{}}):(0,p.jsxs)(p.Fragment,{children:[(0,p.jsx)(i,{label:`Export`,size:`sm`,variant:`ghost`,onClick:()=>{}}),(0,p.jsx)(i,{label:`Delete`,size:`sm`,variant:`ghost`,onClick:n})]})}),(0,p.jsxs)(`div`,{className:`x78zum5 x6s0dn4 xjcht0a xvc5jky x1tgivj0`,children:[(0,p.jsxs)(`span`,{children:[t.size,` selected`]}),(0,p.jsx)(`span`,{"aria-hidden":`true`,className:`xv1l7n4`,children:`•`}),(0,p.jsx)(i,{label:`Unselect All`,size:`sm`,variant:`ghost`,onClick:n})]})]})}function d({layout:e}){let t=e===`floating`?O:v,[n,r]=(0,f.useState)(new Set),{selectionConfig:i}=l({data:t,idKey:`id`,selectedKeys:n,setSelectedKeys:r}),a=c(i);return(0,p.jsxs)(`div`,{className:`xrlsmeg xvueqy4`,children:[e===`floating`?(0,p.jsx)(`div`,{className:`xrvj5dj x185a7wo xjcht0a x4d5cxa`,role:`region`,"aria-label":`Metrics`,children:[[`Active users`,`12,840`],[`Selection rate`,`18.4%`],[`Pending reviews`,`247`]].map(([e,t])=>(0,p.jsxs)(`div`,{className:`x1shk3sm x1hviunn xwmxj5m`,children:[(0,p.jsx)(`span`,{className:`x1lliihq xv1l7n4`,children:e}),(0,p.jsx)(`strong`,{className:`x1lliihq xcsaf9d x1tgivj0`,children:t})]},e))}):null,(0,p.jsxs)(`div`,{"data-table-region":e,...{0:{className:`x1n2onr6`},1:{className:`x1n2onr6 xjo5hrp`}}[(e===`floating`)<<0],children:[(0,p.jsx)(u,{layout:e,selectedKeys:n,clearSelection:()=>r(new Set)}),(0,p.jsx)(o,{data:t,columns:y,idKey:`id`,hasHover:!0,plugins:{selection:a}})]})]})}var f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j;e((()=>{f=t(n()),a(),s(),p=r(),{expect:m,userEvent:h,waitFor:g,within:_}=__STORYBOOK_MODULE_TEST__,v=[{id:`1`,name:`Alice`,email:`alice@example.com`,role:`Engineer`,isLocked:!1},{id:`2`,name:`Bob`,email:`bob@example.com`,role:`Designer`,isLocked:!1},{id:`3`,name:`Charlie`,email:`charlie@example.com`,role:`Manager`,isLocked:!1},{id:`4`,name:`Diana`,email:`diana@example.com`,role:`Engineer`,isLocked:!0},{id:`5`,name:`Eve`,email:`eve@example.com`,role:`Admin`,isLocked:!1}],y=[{key:`name`,header:`Name`},{key:`email`,header:`Email`},{key:`role`,header:`Role`}],b={title:`Core/TableSelection`,tags:[`autodocs`]},x={render:()=>{let[e,t]=(0,f.useState)(new Set),{selectionConfig:n}=l({data:v,idKey:`id`,selectedKeys:e,setSelectedKeys:t}),r=c(n);return(0,p.jsxs)(`div`,{style:{maxWidth:600},children:[(0,p.jsxs)(`p`,{style:{marginBottom:8,fontSize:14,color:`var(--color-text-secondary)`},children:[`Selected: `,e.size,` of `,v.length]}),(0,p.jsx)(o,{data:v,columns:y,idKey:`id`,plugins:{selection:r}})]})}},S={render:()=>{let[e,t]=(0,f.useState)(new Set([`1`,`3`])),{selectionConfig:n}=l({data:v,idKey:`id`,selectedKeys:e,setSelectedKeys:t}),r=c(n);return(0,p.jsxs)(`div`,{style:{maxWidth:600},children:[(0,p.jsxs)(`p`,{style:{marginBottom:8,fontSize:14,color:`var(--color-text-secondary)`},children:[`Selected: `,[...e].join(`, `)||`none`]}),(0,p.jsx)(o,{data:v,columns:y,idKey:`id`,plugins:{selection:r}})]})}},C={render:()=>{let[e,t]=(0,f.useState)(new Set),{selectionConfig:n}=l({data:v,idKey:`id`,selectedKeys:e,setSelectedKeys:t,getIsItemSelectable:e=>e.role!==`Admin`}),r=c(n);return(0,p.jsxs)(`div`,{style:{maxWidth:600},children:[(0,p.jsxs)(`p`,{style:{marginBottom:8,fontSize:14,color:`var(--color-text-secondary)`},children:[`Admin rows have no checkbox. Selected: `,e.size]}),(0,p.jsx)(o,{data:v,columns:y,idKey:`id`,plugins:{selection:r}})]})}},w={render:()=>{let[e,t]=(0,f.useState)(new Set),{selectionConfig:n}=l({data:v,idKey:`id`,selectedKeys:e,setSelectedKeys:t,getIsItemEnabled:e=>!e.isLocked}),r=c(n);return(0,p.jsxs)(`div`,{style:{maxWidth:600},children:[(0,p.jsxs)(`p`,{style:{marginBottom:8,fontSize:14,color:`var(--color-text-secondary)`},children:[`Locked rows (Diana) have a disabled checkbox. Select-all skips them. Selected: `,e.size]}),(0,p.jsx)(o,{data:v,columns:y,idKey:`id`,plugins:{selection:r}})]})}},T={render:()=>{let[e,t]=(0,f.useState)(new Set),{selectionConfig:n}=l({data:v,idKey:`id`,selectedKeys:e,setSelectedKeys:t}),r=c(n);return(0,p.jsx)(`div`,{style:{maxWidth:600},children:(0,p.jsx)(o,{data:v,columns:y,idKey:`id`,density:`compact`,plugins:{selection:r}})})}},E={render:()=>{let[e,t]=(0,f.useState)(new Set),{selectionConfig:n}=l({data:v,idKey:`id`,selectedKeys:e,setSelectedKeys:t}),r=c(n);return(0,p.jsx)(`div`,{style:{maxWidth:600},children:(0,p.jsx)(o,{data:v,columns:y,idKey:`id`,density:`spacious`,hasHover:!0,plugins:{selection:r}})})}},D={render:()=>{let[e,t]=(0,f.useState)(new Set),{selectionConfig:n}=l({data:v,idKey:`id`,selectedKeys:e,setSelectedKeys:t}),r=c(n);return(0,p.jsx)(`div`,{style:{maxWidth:600},children:(0,p.jsx)(o,{data:v,columns:y,idKey:`id`,isStriped:!0,plugins:{selection:r}})})}},O=Array.from({length:40},(e,t)=>{let n=v[t%v.length];return{...n,id:`long-${t+1}`,name:`${n.name} ${t+1}`}}),k={render:()=>(0,p.jsx)(d,{layout:`fixed`}),play:async({canvasElement:e})=>{let t=_(e);await h.click(t.getAllByLabelText(`Select row`)[0]);let n=t.getByRole(`toolbar`,{name:`Bulk actions`});await m(n).toHaveAttribute(`data-layout`,`fixed`),await m(n.closest(`[role="group"]`)).toBeNull(),await m(t.getByText(`1 selected`)).toBeInTheDocument(),await h.click(t.getByRole(`button`,{name:`Unselect All`})),await m(t.queryByRole(`toolbar`,{name:`Bulk actions`})).not.toBeInTheDocument(),await h.click(t.getAllByLabelText(`Select row`)[0])}},A={render:()=>(0,p.jsx)(d,{layout:`floating`}),play:async({canvasElement:e})=>{let t=_(e),n=e.ownerDocument.defaultView;if(n==null)throw Error(`Expected a browser window for the floating example`);n.scrollTo(0,0),await h.click(t.getAllByLabelText(`Select row`)[0]);let r=t.getByRole(`toolbar`,{name:`Bulk actions`}),i=e.querySelector(`[data-table-region="floating"]`);if(i==null)throw Error(`Expected the floating table region`);await m(r).toHaveAttribute(`data-layout`,`floating`),await m(r.closest(`[role="group"]`)).toBeNull();let a=n.scrollY+i.getBoundingClientRect().top;n.scrollTo(0,a+300),await g(()=>{m(Math.round(r.getBoundingClientRect().top)).toBe(16)}),n.scrollTo(0,0)}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const {
      selectionConfig
    } = useTableSelectionState<User>({
      data: users,
      idKey: 'id',
      selectedKeys,
      setSelectedKeys
    });
    const selectionPlugin = useTableSelection<User>(selectionConfig);
    return <div style={{
      maxWidth: 600
    }}>
        <p style={{
        marginBottom: 8,
        fontSize: 14,
        color: 'var(--color-text-secondary)'
      }}>
          Selected: {selectedKeys.size} of {users.length}
        </p>
        <Table data={users} columns={columns} idKey="id" plugins={{
        selection: selectionPlugin
      }} />
      </div>;
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(['1', '3']));
    const {
      selectionConfig
    } = useTableSelectionState<User>({
      data: users,
      idKey: 'id',
      selectedKeys,
      setSelectedKeys
    });
    const selectionPlugin = useTableSelection<User>(selectionConfig);
    return <div style={{
      maxWidth: 600
    }}>
        <p style={{
        marginBottom: 8,
        fontSize: 14,
        color: 'var(--color-text-secondary)'
      }}>
          Selected: {[...selectedKeys].join(', ') || 'none'}
        </p>
        <Table data={users} columns={columns} idKey="id" plugins={{
        selection: selectionPlugin
      }} />
      </div>;
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const {
      selectionConfig
    } = useTableSelectionState<User>({
      data: users,
      idKey: 'id',
      selectedKeys,
      setSelectedKeys,
      getIsItemSelectable: item => item.role !== 'Admin'
    });
    const selectionPlugin = useTableSelection<User>(selectionConfig);
    return <div style={{
      maxWidth: 600
    }}>
        <p style={{
        marginBottom: 8,
        fontSize: 14,
        color: 'var(--color-text-secondary)'
      }}>
          Admin rows have no checkbox. Selected: {selectedKeys.size}
        </p>
        <Table data={users} columns={columns} idKey="id" plugins={{
        selection: selectionPlugin
      }} />
      </div>;
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const {
      selectionConfig
    } = useTableSelectionState<User>({
      data: users,
      idKey: 'id',
      selectedKeys,
      setSelectedKeys,
      getIsItemEnabled: item => !item.isLocked
    });
    const selectionPlugin = useTableSelection<User>(selectionConfig);
    return <div style={{
      maxWidth: 600
    }}>
        <p style={{
        marginBottom: 8,
        fontSize: 14,
        color: 'var(--color-text-secondary)'
      }}>
          Locked rows (Diana) have a disabled checkbox. Select-all skips them.
          Selected: {selectedKeys.size}
        </p>
        <Table data={users} columns={columns} idKey="id" plugins={{
        selection: selectionPlugin
      }} />
      </div>;
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const {
      selectionConfig
    } = useTableSelectionState<User>({
      data: users,
      idKey: 'id',
      selectedKeys,
      setSelectedKeys
    });
    const selectionPlugin = useTableSelection<User>(selectionConfig);
    return <div style={{
      maxWidth: 600
    }}>
        <Table data={users} columns={columns} idKey="id" density="compact" plugins={{
        selection: selectionPlugin
      }} />
      </div>;
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const {
      selectionConfig
    } = useTableSelectionState<User>({
      data: users,
      idKey: 'id',
      selectedKeys,
      setSelectedKeys
    });
    const selectionPlugin = useTableSelection<User>(selectionConfig);
    return <div style={{
      maxWidth: 600
    }}>
        <Table data={users} columns={columns} idKey="id" density="spacious" hasHover plugins={{
        selection: selectionPlugin
      }} />
      </div>;
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => {
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const {
      selectionConfig
    } = useTableSelectionState<User>({
      data: users,
      idKey: 'id',
      selectedKeys,
      setSelectedKeys
    });
    const selectionPlugin = useTableSelection<User>(selectionConfig);
    return <div style={{
      maxWidth: 600
    }}>
        <Table data={users} columns={columns} idKey="id" isStriped plugins={{
        selection: selectionPlugin
      }} />
      </div>;
  }
}`,...D.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => <BulkActionsExample layout="fixed" />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByLabelText('Select row')[0]);
    const toolbar = canvas.getByRole('toolbar', {
      name: 'Bulk actions'
    });
    await expect(toolbar).toHaveAttribute('data-layout', 'fixed');
    await expect(toolbar.closest('[role="group"]')).toBeNull();
    await expect(canvas.getByText('1 selected')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', {
      name: 'Unselect All'
    }));
    await expect(canvas.queryByRole('toolbar', {
      name: 'Bulk actions'
    })).not.toBeInTheDocument();

    // Leave the story ready for manual review.
    await userEvent.click(canvas.getAllByLabelText('Select row')[0]);
  }
}`,...k.parameters?.docs?.source},description:{story:`Product-composed in-flow bar. Actions lead; selection status and clear trail.`,...k.parameters?.docs?.description}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <BulkActionsExample layout="floating" />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const view = canvasElement.ownerDocument.defaultView;
    if (view == null) {
      throw new Error('Expected a browser window for the floating example');
    }
    view.scrollTo(0, 0);
    await userEvent.click(canvas.getAllByLabelText('Select row')[0]);
    const toolbar = canvas.getByRole('toolbar', {
      name: 'Bulk actions'
    });
    const region = canvasElement.querySelector<HTMLElement>('[data-table-region="floating"]');
    if (region == null) {
      throw new Error('Expected the floating table region');
    }
    await expect(toolbar).toHaveAttribute('data-layout', 'floating');
    await expect(toolbar.closest('[role="group"]')).toBeNull();
    const regionTop = view.scrollY + region.getBoundingClientRect().top;
    view.scrollTo(0, regionTop + 300);
    await waitFor(() => {
      expect(Math.round(toolbar.getBoundingClientRect().top)).toBe(16);
    });
    view.scrollTo(0, 0);
  }
}`,...A.parameters?.docs?.source},description:{story:`Product-composed page-sticky bar for a long, non-sticky table below metrics.
It lives outside Table's horizontal overflow wrapper, sticks 16px from the
page viewport, and releases at the table region's block-end boundary.`,...A.parameters?.docs?.description}}},j=[`Default`,`WithPreselection`,`NonSelectableRows`,`DisabledRows`,`Compact`,`Spacious`,`WithStripedRows`,`BulkActions`,`BulkActionsFloating`]}))();export{k as BulkActions,A as BulkActionsFloating,T as Compact,x as Default,w as DisabledRows,C as NonSelectableRows,E as Spacious,S as WithPreselection,D as WithStripedRows,j as __namedExportsOrder,b as default};