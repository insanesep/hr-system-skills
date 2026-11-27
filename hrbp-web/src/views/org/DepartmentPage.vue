<template>
  <div class="dept-page">
    <el-row :gutter="16">
      <el-col :span="9">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <el-input v-model="keyword" placeholder="搜索部门名称 / 编码" clearable :prefix-icon="Search"
                        style="width: 220px" @input="loadTree" />
            </div>
          </template>
          <el-tree ref="treeRef" :data="tree" node-key="id" :props="{ label: 'deptName' }"
                   default-expand-all highlight-current :expand-on-click-node="false"
                   @node-click="onSelect">
            <template #default="{ data }">
              <div class="tree-node">
                <el-tag size="small" :type="levelTag(data.levelType)" effect="plain">{{ data.levelType }}</el-tag>
                <span :class="{ disabled: data.status === 0 }">{{ data.deptName }}</span>
                <span class="code">{{ data.deptCode }}</span>
              </div>
            </template>
          </el-tree>
        </el-card>
      </el-col>
      <el-col :span="15">
        <el-card shadow="never" v-if="current">
          <template #header>
            <div class="card-header">
              <span>{{ current.deptName }}</span>
              <div v-if="current.parentId !== '0' && current.parentId !== 0">
                <el-button size="small" type="primary" @click="openDialog('create')">新增下级</el-button>
                <el-button size="small" @click="openDialog('edit')">编辑</el-button>
                <el-button size="small" :type="current.status === 1 ? 'warning' : 'success'" @click="onToggle">
                  {{ current.status === 1 ? '停用' : '启用' }}
                </el-button>
                <el-popconfirm title="确认删除该部门？仅限无下级且无在职员工的空叶子" @confirm="onDelete">
                  <template #reference><el-button size="small" type="danger">删除</el-button></template>
                </el-popconfirm>
              </div>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="部门编码">{{ current.deptCode }}</el-descriptions-item>
            <el-descriptions-item label="层级类型">{{ current.levelType }}</el-descriptions-item>
            <el-descriptions-item label="编制人数">{{ current.quota ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="current.status === 1 ? 'success' : 'info'">{{ current.status === 1 ? '启用' : '停用' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="成立日期">{{ current.foundDate || '—' }}</el-descriptions-item>
            <el-descriptions-item label="撤销日期">{{ current.revokeDate || '—' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ current.remark || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
        <el-empty v-else description="请选择左侧部门" />
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增下级部门' : '编辑部门'" width="480px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="部门名称" prop="deptName">
          <el-input v-model="form.deptName" maxlength="30" placeholder="1-30 字，同级唯一" />
        </el-form-item>
        <el-form-item label="部门编码" prop="deptCode">
          <el-input v-model="form.deptCode" maxlength="32" placeholder="2-32 位，全局唯一" :disabled="dialogMode === 'edit'" />
        </el-form-item>
        <el-form-item label="编制人数">
          <el-input-number v-model="form.quota" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getDeptTree, createDept, updateDept, deleteDept, toggleDeptStatus } from '../../api/org'

const tree = ref([])
const keyword = ref('')
const current = ref(null)
const dialogVisible = ref(false)
const dialogMode = ref('create')
const saving = ref(false)
const formRef = ref()
const form = ref({ deptName: '', deptCode: '', quota: 0, sort: 0, remark: '' })
const formRules = {
  deptName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  deptCode: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    { min: 2, max: 32, message: '2-32 位', trigger: 'blur' }
  ]
}

function levelTag(t) {
  return { 公司: 'danger', 中心: 'warning', 部门: 'primary', 小组: 'success', 子小组: 'info' }[t] || 'info'
}

async function loadTree() {
  tree.value = await getDeptTree(keyword.value || undefined)
}

function onSelect(data) {
  current.value = data
}

function openDialog(mode) {
  dialogMode.value = mode
  if (mode === 'create') {
    form.value = { deptName: '', deptCode: '', quota: 0, sort: 0, remark: '', parentId: current.value.id }
  } else {
    form.value = { ...current.value }
  }
  dialogVisible.value = true
}

async function onSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      await createDept(form.value)
      ElMessage.success('创建成功')
    } else {
      await updateDept(form.value)
      ElMessage.success('保存成功')
    }
    dialogVisible.value = false
    await loadTree()
  } finally {
    saving.value = false
  }
}

async function onToggle() {
  const target = current.value.status === 1 ? 0 : 1
  await toggleDeptStatus(current.value.id, target)
  ElMessage.success(target === 1 ? '已启用' : '已停用')
  current.value = null
  await loadTree()
}

async function onDelete() {
  await deleteDept(current.value.id)
  ElMessage.success('已删除')
  current.value = null
  await loadTree()
}

onMounted(loadTree)
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.tree-node { display: flex; align-items: center; gap: 8px; flex: 1; }
.tree-node .code { color: #bbb; font-size: 12px; }
.tree-node .disabled { color: #bbb; text-decoration: line-through; }
</style>
